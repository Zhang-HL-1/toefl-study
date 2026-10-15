import { GRADE_IDS } from "./grades"
import type { GradeId } from "./grades"
import { EVENT_LIMIT } from "./types"
import type { CardState, ReviewEvent, StoreData } from "./types"

/**
 * Merge rule for two progress snapshots (this browser and the secret gist).
 *
 * Cards are the union of both sides. Nothing is deleted just because one side
 * is missing it — a reset on one device can come back if another device still
 * has the card.
 *
 * For a word that exists on both sides, last write wins:
 * 1. Write clock is `updated` when it is a finite number.
 * 2. Otherwise `lastReviewed`.
 * 3. Otherwise the latest review event `at` for that word on that side.
 * The later clock wins, even when the older card has a higher interval.
 * That keeps a newer lapse ("忘了" resets repetitions) ahead of an older streak.
 *
 * When the clocks are equal, or neither side has one, prefer the card with
 * higher `repetitions`, then higher `interval`, then later `due`. If those
 * match too, keep the local card.
 *
 * Events are the union, de-duplicated by word + timestamp + grade, sorted by
 * time, and capped at {@link EVENT_LIMIT} (newest kept).
 */

function isGrade(value: unknown): value is GradeId {
  return typeof value === "string" && (GRADE_IDS as readonly string[]).includes(value)
}

function isCard(value: unknown): value is CardState {
  if (!value || typeof value !== "object") return false
  const card = value as Partial<CardState>
  if (!isFiniteNumber(card.ease)) return false
  if (!isFiniteNumber(card.interval)) return false
  if (!isFiniteNumber(card.repetitions)) return false
  if (!isFiniteNumber(card.due)) return false
  if (!isFiniteNumber(card.lapses)) return false
  if (card.updated !== undefined && !isFiniteNumber(card.updated)) return false
  if (card.lastReviewed !== undefined && !isFiniteNumber(card.lastReviewed)) return false
  if (card.lastGrade !== undefined && !isGrade(card.lastGrade)) return false
  return true
}

function isEvent(value: unknown): value is ReviewEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<ReviewEvent>
  return (
    typeof event.wordId === "string" &&
    event.wordId.length > 0 &&
    isGrade(event.grade) &&
    isFiniteNumber(event.at) &&
    isFiniteNumber(event.interval)
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function eventKey(event: ReviewEvent): string {
  return `${event.wordId}\0${event.at}\0${event.grade}`
}

export function unionEvents(left: readonly ReviewEvent[], right: readonly ReviewEvent[]): ReviewEvent[] {
  const map = new Map<string, ReviewEvent>()
  for (const event of [...left, ...right]) {
    if (!isEvent(event)) continue
    const key = eventKey(event)
    if (!map.has(key)) map.set(key, event)
  }
  return [...map.values()]
    .sort((a, b) => a.at - b.at || a.wordId.localeCompare(b.wordId) || a.grade.localeCompare(b.grade))
    .slice(-EVENT_LIMIT)
}

export function canonicalizeStore(data: StoreData): StoreData {
  const cards: Record<string, CardState> = {}
  for (const id of Object.keys(data.cards).sort()) {
    const card = data.cards[id]
    if (card) cards[id] = card
  }
  return { version: 1, cards, events: unionEvents(data.events, []) }
}

export function serializeStore(data: StoreData): string {
  return JSON.stringify(canonicalizeStore(data), null, 2)
}

function writeStamp(card: CardState, wordId: string, events: readonly ReviewEvent[]): number | null {
  if (isFiniteNumber(card.updated)) return card.updated
  if (isFiniteNumber(card.lastReviewed)) return card.lastReviewed
  let latest: number | null = null
  for (const event of events) {
    if (event.wordId !== wordId || !isFiniteNumber(event.at)) continue
    if (latest === null || event.at > latest) latest = event.at
  }
  return latest
}

function preferCard(
  wordId: string,
  local: CardState,
  remote: CardState,
  localEvents: readonly ReviewEvent[],
  remoteEvents: readonly ReviewEvent[],
): CardState {
  const localStamp = writeStamp(local, wordId, localEvents)
  const remoteStamp = writeStamp(remote, wordId, remoteEvents)
  if (localStamp !== remoteStamp) {
    if (localStamp === null) return remote
    if (remoteStamp === null) return local
    return localStamp > remoteStamp ? local : remote
  }
  if (local.repetitions !== remote.repetitions) {
    return local.repetitions > remote.repetitions ? local : remote
  }
  if (local.interval !== remote.interval) {
    return local.interval > remote.interval ? local : remote
  }
  if (local.due !== remote.due) return local.due > remote.due ? local : remote
  return local
}

export function mergeStores(local: StoreData, remote: StoreData): StoreData {
  const cards: Record<string, CardState> = {}
  const ids = new Set([...Object.keys(local.cards), ...Object.keys(remote.cards)])
  for (const id of ids) {
    const left = local.cards[id]
    const right = remote.cards[id]
    if (left && right) cards[id] = preferCard(id, left, right, local.events, remote.events)
    else if (left) cards[id] = left
    else if (right) cards[id] = right
  }
  return canonicalizeStore({
    version: 1,
    cards,
    events: unionEvents(local.events, remote.events),
  })
}

export function parseStoreJson(raw: string): StoreData {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("Gist 内容不是合法 JSON。")
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Gist 内容不是进度数据。")
  const record = parsed as { version?: unknown; cards?: unknown; events?: unknown }
  if (
    record.version !== 1 ||
    !record.cards ||
    typeof record.cards !== "object" ||
    Array.isArray(record.cards) ||
    !Array.isArray(record.events)
  ) {
    throw new Error("Gist 内容不是可识别的进度。")
  }
  const cards: Record<string, CardState> = {}
  for (const [id, card] of Object.entries(record.cards)) {
    if (!isCard(card)) throw new Error(`Gist 里的卡片「${id}」无法读取。`)
    cards[id] = card
  }
  const events: ReviewEvent[] = []
  for (const event of record.events) {
    if (!isEvent(event)) throw new Error("Gist 里有一条无法读取的复习记录。")
    events.push(event)
  }
  return canonicalizeStore({ version: 1, cards, events })
}

function card(partial: Partial<CardState> = {}): CardState {
  return { ease: 2.5, interval: 1, repetitions: 1, due: 1, lapses: 0, ...partial }
}

function store(cards: Record<string, CardState>, events: ReviewEvent[] = []): StoreData {
  return { version: 1, cards, events }
}

export function selfCheckMerge(): void {
  const newer = mergeStores(
    store({ a: card({ updated: 10, repetitions: 8, interval: 30 }) }),
    store({ a: card({ updated: 20, repetitions: 0, interval: 1 }) }),
  ).cards.a
  const olderClock = mergeStores(
    store({ a: card({ lastReviewed: 50, repetitions: 1 }) }),
    store({ a: card({ lastReviewed: 10, repetitions: 9, interval: 40 }) }),
  ).cards.a
  const byEvent = mergeStores(
    store({ a: card({ repetitions: 2 }) }, [{ wordId: "a", grade: "remember", at: 10, interval: 1 }]),
    store({ a: card({ repetitions: 1 }) }, [{ wordId: "a", grade: "forgot", at: 30, interval: 1 }]),
  ).cards.a
  const byReps = mergeStores(
    store({ a: card({ updated: 5, repetitions: 1, interval: 10, due: 10 }) }),
    store({ a: card({ updated: 5, repetitions: 4, interval: 1, due: 1 }) }),
  ).cards.a
  const byInterval = mergeStores(
    store({ a: card({ updated: 5, repetitions: 2, interval: 1, due: 99 }) }),
    store({ a: card({ updated: 5, repetitions: 2, interval: 6, due: 1 }) }),
  ).cards.a
  const byDue = mergeStores(
    store({ a: card({ updated: 5, repetitions: 2, interval: 6, due: 10 }) }),
    store({ a: card({ updated: 5, repetitions: 2, interval: 6, due: 40 }) }),
  ).cards.a
  const keepLocal = mergeStores(
    store({ a: card({ updated: 5, ease: 2.1 }) }),
    store({ a: card({ updated: 5, ease: 2.9 }) }),
  ).cards.a
  const union = mergeStores(store({ a: card({ updated: 1 }) }), store({ b: card({ updated: 2 }) }))
  const events = mergeStores(
    store({}, [{ wordId: "a", grade: "remember", at: 1, interval: 1 }]),
    store(
      {},
      [
        { wordId: "a", grade: "remember", at: 1, interval: 9 },
        { wordId: "a", grade: "master", at: 2, interval: 6 },
      ],
    ),
  ).events
  const many: ReviewEvent[] = Array.from({ length: EVENT_LIMIT + 25 }, (_, index) => ({
    wordId: "a",
    grade: "remember" as const,
    at: index + 1,
    interval: 1,
  }))
  const capped = mergeStores(store({}, many), store({}, [{ wordId: "b", grade: "forgot", at: EVENT_LIMIT + 100, interval: 1 }]))

  const ok =
    newer?.updated === 20 &&
    newer.repetitions === 0 &&
    olderClock?.lastReviewed === 50 &&
    byEvent?.repetitions === 1 &&
    byReps?.repetitions === 4 &&
    byInterval?.interval === 6 &&
    byDue?.due === 40 &&
    keepLocal?.ease === 2.1 &&
    union.cards.a?.updated === 1 &&
    union.cards.b?.updated === 2 &&
    events.length === 2 &&
    events[1]?.grade === "master" &&
    capped.events.length === EVENT_LIMIT &&
    capped.events[0]?.at === 27 &&
    capped.events.at(-1)?.wordId === "b"

  if (!ok) {
    const detail = {
      newer,
      olderClock,
      byEvent,
      byReps,
      byInterval,
      byDue,
      keepLocal,
      union,
      events,
      capped: { length: capped.events.length, first: capped.events[0], last: capped.events.at(-1) },
    }
    console.error("progress merge sanity check failed", detail)
    throw new Error("progress merge sanity check failed")
  }
}

if (import.meta.env.DEV) selfCheckMerge()
