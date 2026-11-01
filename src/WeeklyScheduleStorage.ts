import { readStoredJson, saveStoredJson, type SafeStorage } from './StorageSafety'

export const WEEKLY_SCHEDULES_STORAGE_KEY = 'margin-weekly-schedules'
export const weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'] as const
export type Weekday = (typeof weekdays)[number]
export const scheduleColors = [
  { value: 'green', label: '緑' }, { value: 'red', label: '赤' },
  { value: 'blue', label: '青' }, { value: 'amber', label: '琥珀' }, { value: 'purple', label: '紫' },
] as const
type ScheduleColor = (typeof scheduleColors)[number]['value']
export type TimedSchedule = {
  id: string
  title: string
  weekday: Weekday
  startTime: string
  endTime: string
  memo: string
  color: ScheduleColor
}

function isScheduleColor(value: unknown): value is ScheduleColor {
  return scheduleColors.some((color) => color.value === value)
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function parseSchedules(value: unknown): TimedSchedule[] | null {
  if (!Array.isArray(value)) return null
  const schedules: TimedSchedule[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
    const schedule = item as Record<string, unknown>
    if (typeof schedule.id !== 'string' || !schedule.id.trim() || ids.has(schedule.id) ||
      typeof schedule.title !== 'string' ||
      !weekdays.some((weekday) => weekday === schedule.weekday) ||
      !isTime(schedule.startTime) || !isTime(schedule.endTime) || schedule.startTime >= schedule.endTime ||
      (schedule.memo !== undefined && typeof schedule.memo !== 'string') ||
      (schedule.color !== undefined && !isScheduleColor(schedule.color))) return null
    ids.add(schedule.id)
    schedules.push({ id: schedule.id, title: schedule.title, weekday: schedule.weekday as Weekday,
      startTime: schedule.startTime, endTime: schedule.endTime,
      memo: typeof schedule.memo === 'string' ? schedule.memo : '',
      color: isScheduleColor(schedule.color) ? schedule.color : 'green' })
  }
  return schedules
}

export const loadWeeklyScheduleState = (storage?: SafeStorage) => readStoredJson(WEEKLY_SCHEDULES_STORAGE_KEY, '週間予定', [], parseSchedules, storage)
export const writeWeeklySchedules = (schedules: TimedSchedule[], storage?: SafeStorage) => saveStoredJson(WEEKLY_SCHEDULES_STORAGE_KEY, '週間予定', schedules, parseSchedules, [], storage)
