export const DAY_MS = 86_400_000

export function startOfLocalDay(ts: number): number {
  const date = new Date(ts)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addLocalDays(ts: number, days: number): number {
  const date = new Date(startOfLocalDay(ts))
  date.setDate(date.getDate() + days)
  return date.getTime()
}

export function dayKey(ts: number): string {
  const date = new Date(ts)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function dayNumber(ts: number): string {
  return String(new Date(ts).getDate())
}

export function formatInterval(days: number): string {
  if (days <= 0) return "现在"
  if (days < 30) return `${days} 天`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? "1 个月" : `${months} 个月`
  const years = Math.max(1, Math.round(days / 365))
  return years === 1 ? "1 年" : `${years} 年`
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—"
  return `${Math.round(ratio * 100)}%`
}

export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return "夜读"
  if (hour < 11) return "早安"
  if (hour < 14) return "午间"
  if (hour < 18) return "午后"
  if (hour < 22) return "傍晚"
  return "夜读"
}
