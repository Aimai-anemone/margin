import type { DailyRecord } from './DailyRecordStorage'

const dayMs = 86_400_000

// Local calendar components only. UTC arithmetic avoids DST-length days.
export function calendarDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(0)
  value.setUTCFullYear(year, month - 1, day)
  value.setUTCHours(0, 0, 0, 0)
  return value.getTime() / dayMs
}

function hash(text: string) {
  let value = 2166136261
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619)
  return value >>> 0
}

function shuffle(cycle: number, count: number) {
  let seed = hash(`margin-scenery-${cycle}`)
  const values = Array.from({ length: count }, (_, index) => index)
  for (let index = count - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const other = Math.floor(seed / 4294967296 * (index + 1))
    ;[values[index], values[other]] = [values[other], values[index]]
  }
  return values
}

export function sceneryIndex(date: string, count = 30) {
  if (!Number.isInteger(count) || count < 3) throw new Error('At least three images required')
  const day = calendarDay(date)
  const cycle = Math.floor(day / count)
  const order = shuffle(cycle, count)
  // Only swap the first two entries: the previous cycle's last is unchanged.
  if (order[0] === shuffle(cycle - 1, count).at(-1)) {
    ;[order[0], order[1]] = [order[1], order[0]]
  }
  return order[((day % count) + count) % count]
}

export type Memory = { record: DailyRecord; reason: string }

export function selectMemory(records: readonly DailyRecord[], today: string): Memory | null {
  const todayDay = calendarDay(today)
  const year = Number(today.slice(0, 4))
  const monthDay = today.slice(5)
  const eligible = records.filter((record) =>
    record.insight.trim() !== '' && todayDay - calendarDay(record.date) >= 7)
  const anniversary = eligible.filter((record) =>
    Number(record.date.slice(0, 4)) === year - 1 && record.date.slice(5) === monthDay)
  // Leap-year reference keeps Feb 29 distinct. Circular distance covers New Year.
  const seasonalDay = calendarDay(`2000-${monthDay}`)
  const seasonal = eligible.filter((record) => {
    if (Number(record.date.slice(0, 4)) >= year) return false
    const distance = Math.abs(calendarDay(`2000-${record.date.slice(5)}`) - seasonalDay)
    return Math.min(distance, 366 - distance) <= 7
  })
  const candidates = anniversary.length ? anniversary : seasonal.length ? seasonal : eligible
  if (!candidates.length) return null
  const sorted = [...candidates].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  return {
    record: sorted[hash(`margin-memory-${today}`) % sorted.length],
    reason: anniversary.length ? '去年の今日' : seasonal.length ? '過去のこの時期' : '過去の記録',
  }
}
