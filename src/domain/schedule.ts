import { startOfLocalDay } from "./format"
import type { StoreData } from "./types"
import { WORDS, wordsInRoom, type Word } from "./words"
import { totalsFor } from "./progressCounts"

export const NEW_PER_DAY = 12

/** Synced cumulative counts resume an unfinished round on any device. */
export function randomCandidate(pool: readonly Word[], data: StoreData, lastId?: string, random = Math.random): Word | undefined {
  if (!pool.length) return undefined
  const minimum = Math.min(...pool.map((word) => totalsFor(data.cards[word.id]).reviews))
  const candidates = pool.filter((word) => totalsFor(data.cards[word.id]).reviews === minimum)
  const withoutLast = candidates.filter((word) => word.id !== lastId)
  const choices = withoutLast.length ? withoutLast : candidates
  return choices[Math.floor(random() * choices.length)]
}

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
  const pool = roomId ? wordsInRoom(roomId) : WORDS
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
