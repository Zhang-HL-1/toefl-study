import { gradeById, type GradeId } from "./grades"
import { freshCard, scheduleCard } from "./sm2"
import type { StoreData } from "./types"

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
    return isStore(parsed) ? parsed : emptyStore()
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
  const events = [
    ...snapshot.events,
    { wordId, grade: gradeId, at: now, interval: nextCard.interval },
  ].slice(-2000)
  commit({
    version: 1,
    cards: { ...snapshot.cards, [wordId]: nextCard },
    events,
  })
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
    snapshot = loadStore()
    listeners.forEach((listener) => listener())
  })
}
