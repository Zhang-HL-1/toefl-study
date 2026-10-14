import type { GradeId } from "./grades"
import { addLocalDays } from "./format"
import type { CardState } from "./types"

// SuperMemo SM-2. q >= 3 advances. ease' = ease + (0.1 − (5−q)(0.08 + (5−q)·0.02)), floored at 1.3.
// Interval uses the ease from before this update.

export function freshCard(): CardState {
  return { ease: 2.5, interval: 0, repetitions: 0, due: 0, lapses: 0 }
}

export function scheduleCard(card: CardState, q: number, now: number, grade?: GradeId): CardState {
  let { ease, interval, repetitions, lapses } = card

  if (q < 3) {
    repetitions = 0
    interval = 1
    lapses += 1
  } else if (repetitions === 0) {
    interval = 1
    repetitions = 1
  } else if (repetitions === 1) {
    interval = 6
    repetitions = 2
  } else {
    interval = Math.max(1, Math.round(interval * ease))
    repetitions += 1
  }

  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  ease = Math.round((ease + delta) * 100) / 100
  if (ease < 1.3) ease = 1.3

  return {
    ease,
    interval,
    repetitions,
    lapses,
    // Lapses stay due immediately so the word returns in this round, not tomorrow.
    due: q < 3 ? now : addLocalDays(now, interval),
    lastGrade: grade ?? card.lastGrade,
    lastReviewed: now,
  }
}

if (import.meta.env.DEV) {
  const first = scheduleCard(freshCard(), 5, Date.now(), "master")
  const second = scheduleCard(first, 5, Date.now(), "master")
  const third = scheduleCard(second, 5, Date.now(), "master")
  const lapsed = scheduleCard(third, 1, Date.now(), "forgot")
  const ok =
    first.interval === 1 &&
    first.repetitions === 1 &&
    first.ease === 2.6 &&
    second.interval === 6 &&
    second.ease === 2.7 &&
    third.interval === 16 &&
    third.ease === 2.8 &&
    lapsed.repetitions === 0 &&
    lapsed.interval === 1 &&
    lapsed.lapses === 1 &&
    lapsed.ease === 2.26
  if (!ok) console.error("SM-2 sanity check failed", { first, second, third, lapsed })
}
