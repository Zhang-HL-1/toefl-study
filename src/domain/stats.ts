import type { GradeId } from "./grades"
import { GRADE_IDS } from "./grades"
import { addLocalDays, dayKey, dayNumber, startOfLocalDay } from "./format"
import { ROOMS, type Room } from "./rooms"
import { buildQueue, newBudget } from "./schedule"
import type { StoreData } from "./types"
import { WORDS, wordsInRoom } from "./words"
import { totalsFor } from "./progressCounts"

const MASTER_INTERVAL = 21

export interface DayCount {
  key: string
  label: string
  count: number
}

export interface RoomStat {
  room: Room
  total: number
  mastered: number
  learning: number
  unseen: number
  due: number
}

export interface Summary {
  due: number
  newRemaining: number
  available: number
  reviewedToday: number
  streak: number
  totalReviews: number
  retention: number | null
  mastered: number
  learning: number
  unseen: number
  averageEase: number | null
  byGrade: Record<GradeId, number>
  days: DayCount[]
  rooms: RoomStat[]
}

function isMastered(interval: number): boolean {
  return interval >= MASTER_INTERVAL
}

export function summarize(data: StoreData, now: number): Summary {
  const start = startOfLocalDay(now)
  const byGrade = Object.fromEntries(GRADE_IDS.map((id) => [id, 0])) as Record<GradeId, number>
  const dayCounts = new Map<string, number>()

  for (const event of data.events) {
    byGrade[event.grade] += 1
    const key = dayKey(event.at)
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }

  let due = 0
  let mastered = 0
  let learning = 0
  let unseen = 0
  let easeSum = 0
  let easeCount = 0

  const rooms: RoomStat[] = ROOMS.map((room) => ({
    room,
    total: 0,
    mastered: 0,
    learning: 0,
    unseen: 0,
    due: 0,
  }))
  const roomIndex = new Map(rooms.map((stat, index) => [stat.room.id, index]))

  for (const word of WORDS) {
    const card = data.cards[word.id]
    const stat = rooms[roomIndex.get(word.roomId) ?? -1]
    if (stat) stat.total += 1
    if (!card) {
      unseen += 1
      if (stat) stat.unseen += 1
      continue
    }
    easeSum += card.ease
    easeCount += 1
    if (card.due <= now) {
      due += 1
      if (stat) stat.due += 1
    }
    if (isMastered(card.interval)) {
      mastered += 1
      if (stat) stat.mastered += 1
    } else {
      learning += 1
      if (stat) stat.learning += 1
    }
  }

  const totalReviews = Object.values(data.cards).reduce((sum, card) => sum + totalsFor(card).reviews, 0)
  const totalErrors = Object.values(data.cards).reduce((sum, card) => sum + totalsFor(card).errors, 0)
  const retention = totalReviews === 0 ? null : (totalReviews - totalErrors) / totalReviews

  const todayKey = dayKey(now)
  let cursor = dayCounts.has(todayKey) ? start : addLocalDays(now, -1)
  let streak = 0
  while (dayCounts.has(dayKey(cursor))) {
    streak += 1
    cursor = addLocalDays(cursor, -1)
  }

  const days: DayCount[] = []
  for (let offset = 13; offset >= 0; offset -= 1) {
    const ts = addLocalDays(now, -offset)
    const key = dayKey(ts)
    days.push({ key, label: dayNumber(ts), count: dayCounts.get(key) ?? 0 })
  }

  for (const stat of rooms) {
    const pool = wordsInRoom(stat.room.id)
    stat.total = pool.length
    stat.unseen = pool.filter((word) => !data.cards[word.id]).length
    stat.mastered = pool.filter((word) => isMastered(data.cards[word.id]?.interval ?? 0)).length
    stat.learning = stat.total - stat.unseen - stat.mastered
    stat.due = pool.filter((word) => data.cards[word.id]?.due <= now).length
  }

  return {
    due,
    newRemaining: Math.min(unseen, newBudget(data, now)),
    available: buildQueue(data, now).length,
    reviewedToday: data.events.filter((event) => event.at >= start).length,
    streak,
    totalReviews,
    retention,
    mastered,
    learning,
    unseen,
    averageEase: easeCount === 0 ? null : easeSum / easeCount,
    byGrade,
    days,
    rooms,
  }
}
