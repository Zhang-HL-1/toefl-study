import { startOfLocalDay } from "./format"
import type { StoreData } from "./types"
import { WORDS, type Word } from "./words"

export const NEW_PER_DAY = 12

export interface QueueItem {
  word: Word
  kind: "due" | "new"
}

export function introducedToday(data: StoreData, now: number): number {
  const start = startOfLocalDay(now)
  const firstSeen = new Map<string, number>()
  for (const event of data.events) {
    const previous = firstSeen.get(event.wordId)
    if (previous === undefined || event.at < previous) firstSeen.set(event.wordId, event.at)
  }
  let count = 0
  for (const at of firstSeen.values()) if (at >= start) count += 1
  return count
}

export function newBudget(data: StoreData, now: number): number {
  return Math.max(0, NEW_PER_DAY - introducedToday(data, now))
}

export function buildQueue(data: StoreData, now: number, roomId?: string): QueueItem[] {
  const pool = roomId ? WORDS.filter((word) => word.roomId === roomId) : WORDS
  const due: QueueItem[] = []
  const fresh: Word[] = []

  for (const word of pool) {
    const card = data.cards[word.id]
    if (!card) {
      fresh.push(word)
      continue
    }
    if (card.due <= now) due.push({ word, kind: "due" })
  }

  due.sort((a, b) => (data.cards[a.word.id]?.due ?? 0) - (data.cards[b.word.id]?.due ?? 0))
  const slots = Math.min(fresh.length, newBudget(data, now))
  const newer: QueueItem[] = fresh.slice(0, slots).map((word) => ({ word, kind: "new" }))
  return [...due, ...newer]
}
