import assert from "node:assert/strict"
import { createServer } from "vite"

const server = await createServer({ server: { middlewareMode: true } })
try {
  const { WORDS, SOURCE_BOOKS, wordsInRoom } = await server.ssrLoadModule("/src/domain/words.ts")
  const { randomCandidate } = await server.ssrLoadModule("/src/domain/schedule.ts")
  const { mergeStores, parseStoreJson, serializeStore, selfCheckMerge } = await server.ssrLoadModule("/src/domain/mergeProgress.ts")
  const { totalsFor } = await server.ssrLoadModule("/src/domain/progressCounts.ts")
  selfCheckMerge()
  assert.equal(new Set(WORDS.map((word) => word.id)).size, WORDS.length)
  for (const book of SOURCE_BOOKS) {
    const refs = WORDS.flatMap((word) => word.sources ?? []).filter((source) => source.bookId === book.id)
    assert.equal(refs.length, book.entries)
    assert.deepEqual(refs.map((ref) => ref.index).sort((a, b) => a - b), Array.from({ length: book.entries }, (_, i) => i + 1))
    assert(wordsInRoom(`book-${book.id}`).every((word) => word.sources.some((ref) => ref.bookId === book.id)))
  }
  const pool = WORDS.slice(0, 3)
  const empty = () => ({ version: 1, cards: {}, events: [] })
  const card = (counts = {}, updated = 1) => ({ ease: 2.5, interval: 1, repetitions: 1, due: 1, lapses: 0, counts, updated })
  let data = empty(), last
  for (let round = 0; round < 3; round++) {
    const seen = new Set()
    for (let i = 0; i < pool.length; i++) {
      const word = randomCandidate(pool, data, last, () => 0.5)
      assert(!seen.has(word.id), "no repeat within a round")
      if (!i && last) assert.notEqual(word.id, last, "no immediate repeat across rounds")
      seen.add(word.id); last = word.id
      data.cards[word.id] = card({ a: { reviews: round + 1, errors: 0, fuzzy: 0 } })
      data = parseStoreJson(serializeStore(data)) // simulate reload after every review
    }
    assert.equal(seen.size, pool.length)
  }
  assert.equal(randomCandidate([], data), undefined)
  assert.equal(randomCandidate(pool.slice(0, 1), data).id, pool[0].id)
  const left = { ...empty(), cards: { x: card({ a: { reviews: 4, errors: 2, fuzzy: 1 } }, 1) } }
  const right = { ...empty(), cards: { x: card({ b: { reviews: 3, errors: 3, fuzzy: 0 } }, 2) } }
  const merged = mergeStores(left, right)
  assert.deepEqual(totalsFor(merged.cards.x), { reviews: 7, errors: 5, fuzzy: 1 })
  assert.equal(serializeStore(mergeStores(merged, right)), serializeStore(merged), "repeated sync must not double-count")
  assert.equal(serializeStore(mergeStores(left, right)), serializeStore(mergeStores(right, left)))
  const legacy = { ...empty(), cards: { x: { ease: 2.5, interval: 1, repetitions: 1, due: 1, lapses: 8 } } }
  const migrated = parseStoreJson(serializeStore(legacy))
  assert.equal(totalsFor(migrated.cards.x).errors, 8)
  assert.equal(totalsFor(mergeStores(migrated, legacy).cards.x).errors, 8)
  assert.throws(() => parseStoreJson(JSON.stringify({ ...empty(), cards: { x: card({ a: { reviews: 1, errors: -1, fuzzy: 0 } }) } })))

  // Real sync orchestration against a mock Gist. No credentials or user data.
  const cache = new Map()
  const storage = { getItem: (key) => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: (key) => cache.delete(key) }
  globalThis.localStorage = storage
  globalThis.sessionStorage = storage
  const timers = new Map(); let timer = 0
  globalThis.window = Object.assign(new EventTarget(), {
    setTimeout: (callback) => { timers.set(++timer, callback); return timer },
    clearTimeout: (id) => timers.delete(id), setInterval: () => 1,
  })
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible" })
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true })
  const originalFetch = globalThis.fetch
  let offline = false
  const gist = { id: "abcdef0123456789", public: false, html_url: "https://gist.github.com/abcdef0123456789", files: {} }
  const patches = []
  globalThis.fetch = async (input, init = {}) => {
    if (offline) throw new TypeError("offline")
    const url = String(input)
    if (init.method === "POST") {
      const body = JSON.parse(init.body); assert.equal(body.public, false)
      gist.files = body.files
      return Response.json(gist)
    }
    if (init.method === "PATCH") {
      const files = JSON.parse(init.body).files
      assert(Object.keys(files).every((name) => name.startsWith("atrium-device-")))
      patches.push(files); gist.files = { ...gist.files, ...files }
      return Response.json(gist)
    }
    return Response.json(url.includes("/gists?") ? [] : gist)
  }
  const store = await server.ssrLoadModule("/src/domain/store.ts")
  const sync = await server.ssrLoadModule("/src/domain/githubSync.ts")
  sync.installGithubSync()
  assert.equal(await sync.connectGithub("test-token", ""), true)
  store.reviewWord(pool[0].id, "forgot", 100)
  await sync.syncGithubNow()
  assert.equal(totalsFor(store.getSnapshot().cards[pool[0].id]).errors, 1)
  const remote = empty()
  remote.cards[pool[0].id] = card({ otherDevice: { reviews: 2, errors: 2, fuzzy: 0 } }, 200)
  gist.files["atrium-device-other.json"] = { content: serializeStore(remote) }
  await sync.syncGithubNow()
  assert.equal(totalsFor(store.getSnapshot().cards[pool[0].id]).errors, 3)
  await sync.syncGithubNow()
  assert.equal(totalsFor(store.getSnapshot().cards[pool[0].id]).errors, 3)
  offline = true
  store.reviewWord(pool[0].id, "forgot", 300)
  await sync.syncGithubNow()
  assert(sync.getGithubSyncSnapshot().lastError)
  assert.equal(totalsFor(store.getSnapshot().cards[pool[0].id]).errors, 4)
  offline = false
  await sync.syncGithubNow()
  assert.equal(sync.getGithubSyncSnapshot().lastError, null)
  assert(patches.length > 0)
  assert(!JSON.stringify(gist.files).includes("test-token"))
  globalThis.fetch = originalFetch
  console.log(`PASS: ${WORDS.length} words; all 11,767 PDF references; random rounds/reload; legacy migration; concurrent-device counters; offline/reconnect sync.`)
} finally {
  await server.close()
}
