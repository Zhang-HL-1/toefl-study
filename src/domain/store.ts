import { gradeById, type GradeId } from "./grades"
import { canonicalizeStore, serializeStore, mergeStores } from "./mergeProgress"
import { countsFor, writerId, totalsFor } from "./progressCounts"
import { freshCard, scheduleCard } from "./sm2"
import { EVENT_LIMIT, type StoreData } from "./types"

const KEY = "atrium.toefl.v1"

function emptyStore(): StoreData {
  return { version: 1, cards: {}, events: [] }
}

function isStore(value: unknown): value is StoreData {
  if (!value || typeof value !== "object") return false
  const record = value as StoreData
  return record.version === 1 && !!record.cards && Array.isArray(record.events)
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed: unknown = JSON.parse(raw)
    return isStore(parsed) ? canonicalizeStore(parsed) : emptyStore()
  } catch {
    return emptyStore()
  }
}

let snapshot: StoreData = typeof localStorage === "undefined" ? emptyStore() : loadStore()
const listeners = new Set<() => void>()

function commit(next: StoreData) {
  snapshot = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or a full quota: keep the in-memory snapshot.
  }
  listeners.forEach((listener) => listener())
}

export function getSnapshot(): StoreData {
  return snapshot
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function reviewWord(wordId: string, gradeId: GradeId, now = Date.now()) {
  const grade = gradeById(gradeId)
  const previous = snapshot.cards[wordId] ?? freshCard()
  const nextCard = scheduleCard(previous, grade.q, now, gradeId)
  const counts = countsFor(previous, snapshot.events, wordId)
  const device = writerId()
  const current = counts[device] ?? { reviews: 0, errors: 0, fuzzy: 0 }
  nextCard.counts = { ...counts, [device]: {
    reviews: current.reviews + 1,
    errors: current.errors + (gradeId === "forgot" ? 1 : 0),
    fuzzy: current.fuzzy + (gradeId === "fuzzy" ? 1 : 0),
  } }
  nextCard.lapses = totalsFor(nextCard).errors
  const events = [
    ...snapshot.events,
    { id: crypto.randomUUID(), wordId, grade: gradeId, at: now, interval: nextCard.interval },
  ].slice(-EVENT_LIMIT)
  commit({
    version: 1,
    cards: { ...snapshot.cards, [wordId]: nextCard },
    events,
  })
}

/** Replace the in-memory store and local cache. No-op when the canonical JSON is unchanged. */
export function replaceStore(next: StoreData) {
  const canonical = canonicalizeStore(next)
  if (serializeStore(canonical) === serializeStore(snapshot)) return
  commit(canonical)
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore storage failures; memory still resets.
  }
  commit(emptyStore())
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return
    const disk = loadStore()
    const merged = mergeStores(snapshot, disk)
    if (serializeStore(merged) === serializeStore(snapshot)) return
    if (serializeStore(merged) !== serializeStore(disk)) commit(merged)
    else {
      snapshot = merged
      listeners.forEach((listener) => listener())
    }
  })
}
