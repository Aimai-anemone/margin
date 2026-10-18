import { isDailyRecord, isValidRecordDate, type DailyRecord } from './DailyRecordStorage'

export type RecordPeriod = 'day' | 'week' | 'all'

function localDateText(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekRange(today: string) {
  const start = new Date(`${today}T12:00:00`)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: localDateText(start), end: localDateText(end) }
}

export function summarizeDailyRecords(
  records: readonly DailyRecord[],
  period: RecordPeriod,
  today: string,
) {
  if (!isValidRecordDate(today)) throw new Error('集計の基準日を確認してください。')

  // 不正な記録や未来日は集計だけから除外し、保存内容は変更しない。
  const availableRecords = records.filter((record) => isDailyRecord(record) && record.date <= today)
  const dates = availableRecords.map((record) => record.date).sort()
  const range = period === 'day' ? { start: today, end: today }
    : period === 'week' ? weekRange(today)
      : { start: dates[0] ?? null, end: dates.at(-1) ?? null }
  const selectedRecords = availableRecords.filter((record) =>
    range.start !== null && range.end !== null && record.date >= range.start && record.date <= range.end)

  let screenTimeDays = 0
  let screenTimeSum = 0
  let breakdownDays = 0
  let breakdownScreenTimeSum = 0
  let unintendedSum = 0
  let totalPlans = 0
  let completedPlans = 0

  for (const record of selectedRecords) {
    if (record.screenTimeMinutes !== null) {
      screenTimeDays += 1
      screenTimeSum += record.screenTimeMinutes
      if (record.unintendedMinutes !== null) {
        breakdownDays += 1
        breakdownScreenTimeSum += record.screenTimeMinutes
        unintendedSum += record.unintendedMinutes
      }
    }
    totalPlans += record.loosePlans.length
    completedPlans += record.loosePlans.filter((plan) => plan.completed).length
  }

  const unintendedPercentage = breakdownScreenTimeSum > 0
    ? Math.round(unintendedSum / breakdownScreenTimeSum * 100) : null

  return {
    range,
    recordCount: selectedRecords.length,
    screenTimeDays,
    screenTimeTotalMinutes: screenTimeDays > 0 ? screenTimeSum : null,
    screenTimeAverageMinutes: screenTimeDays > 0 ? Math.round(screenTimeSum / screenTimeDays) : null,
    breakdownDays,
    breakdownScreenTimeMinutes: breakdownDays > 0 ? breakdownScreenTimeSum : null,
    intendedMinutes: breakdownDays > 0 ? Math.max(0, breakdownScreenTimeSum - unintendedSum) : null,
    unintendedMinutes: breakdownDays > 0 ? unintendedSum : null,
    unintendedPercentage,
    intendedPercentage: unintendedPercentage === null ? null : 100 - unintendedPercentage,
    totalPlans,
    completedPlans,
    completionPercentage: totalPlans > 0 ? Math.round(completedPlans / totalPlans * 100) : null,
  }
}

export function formatRecordMinutes(minutes: number | null) {
  if (minutes === null) return '記録なし'
  if (minutes === 0) return '0分'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours ? `${hours}時間` : ''}${rest ? `${rest}分` : ''}`
}

function formatDate(date: string, includeYear = false) {
  return new Intl.DateTimeFormat('ja-JP', {
    ...(includeYear ? { year: 'numeric' } : {}), month: 'long', day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

export function formatRecordPeriod(
  period: RecordPeriod,
  range: { start: string | null; end: string | null },
  today: string,
) {
  if (period === 'day') {
    const date = new Date(`${today}T12:00:00`)
    return `今日・${new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(date)}`
  }
  if (range.start === null || range.end === null) return 'まだ集計できる記録はありません'
  const includeYear = range.start.slice(0, 4) !== range.end.slice(0, 4) ||
    range.start.slice(0, 4) !== today.slice(0, 4)
  return range.start === range.end ? formatDate(range.start, includeYear)
    : `${formatDate(range.start, includeYear)}～${formatDate(range.end, includeYear)}`
}
