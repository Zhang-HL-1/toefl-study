import type { GradeId } from "./grades"

export interface CardState {
  ease: number
  interval: number
  repetitions: number
  due: number
  lapses: number
  lastGrade?: GradeId
  lastReviewed?: number
}

export interface ReviewEvent {
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
