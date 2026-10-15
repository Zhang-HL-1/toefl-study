import type { GradeId } from "./grades"
import type { Counts } from "./progressCounts"

export interface CardState {
  counts?: Counts
  ease: number
  interval: number
  repetitions: number
  due: number
  lapses: number
  lastGrade?: GradeId
  lastReviewed?: number
  /** Milliseconds of the review that wrote this card. Merge treats it as the write clock. */
  updated?: number
}

/** Review history kept on device and in the gist. Shared by the local store and sync merge. */
export const EVENT_LIMIT = 2000

export interface ReviewEvent {
  id?: string
  wordId: string
  grade: GradeId
  at: number
  interval: number
}

export interface StoreData {
  version: 1
  cards: Record<string, CardState>
  events: ReviewEvent[]
}
