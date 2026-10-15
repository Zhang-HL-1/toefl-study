import type { CardState, ReviewEvent } from "./types"

export interface DeviceCount { reviews: number; errors: number; fuzzy: number }
export type Counts = Record<string, DeviceCount>

export function countsFor(card: CardState | undefined, events: readonly ReviewEvent[] = [], wordId = ""): Counts {
  if (!card) return {}
  if (card.counts) return card.counts
  const history = events.filter((event) => event.wordId === wordId)
  return { legacy: {
    reviews: Math.max(history.length, card.repetitions + card.lapses),
    errors: Math.max(card.lapses, history.filter((event) => event.grade === "forgot").length),
    fuzzy: history.filter((event) => event.grade === "fuzzy").length,
  } }
}

export function mergeCounts(left: Counts, right: Counts): Counts {
  const merged: Counts = {}
  for (const id of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    merged[id] = {
      reviews: Math.max(left[id]?.reviews ?? 0, right[id]?.reviews ?? 0),
      errors: Math.max(left[id]?.errors ?? 0, right[id]?.errors ?? 0),
      fuzzy: Math.max(left[id]?.fuzzy ?? 0, right[id]?.fuzzy ?? 0),
    }
  }
  return merged
}

export function totalsFor(card: CardState | undefined) {
  return Object.values(countsFor(card)).reduce((total, count) => ({
    reviews: total.reviews + count.reviews,
    errors: total.errors + count.errors,
    fuzzy: total.fuzzy + count.fuzzy,
  }), { reviews: 0, errors: 0, fuzzy: 0 })
}

let fallbackId: string | undefined
export function deviceId(): string {
  const key = "atrium.device.v1"
  try {
    const existing = localStorage.getItem(key)
    if (existing && /^[a-zA-Z0-9-]+$/.test(existing)) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    fallbackId ??= crypto.randomUUID()
    return fallbackId
  }
}

// Separate actors for tabs prevent simultaneous reviews from losing increments.
let currentWriter: string | undefined
export function writerId(): string {
  currentWriter ??= `${deviceId()}-${crypto.randomUUID()}`
  return currentWriter
}
