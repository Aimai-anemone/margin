import { readStoredJson, saveStoredJson, type SafeStorage } from './StorageSafety'

export const TIMETABLE_SETTINGS_KEY = 'margin-timetable-settings'
export const MAX_PERIODS = 8
export const courseWeekdays = [
  '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日',
] as const
export const terms = [1, 2, 3, 4] as const
export type Term = (typeof terms)[number]
export type DayMode = 'weekdays' | 'saturday' | 'weekend'
export type PeriodTime = { startTime: string; endTime: string }
export type TimetableSettings = {
  dayMode: DayMode
  periodCount: number
  periods: PeriodTime[]
  academicYear: number
  term: Term
  legacyAcademicYear: number
  weeklyStartHour?: number
}

export function isWeeklyStartHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
}

export function getAcademicYear(date = new Date()) {
  return date.getFullYear() - (date.getMonth() < 3 ? 1 : 0)
}

export function isAcademicYear(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2000 && value <= 2100
}

export function isTerm(value: unknown): value is Term {
  return terms.some((term) => term === value)
}

export function createDefaultTimetableSettings(): TimetableSettings {
  return {
    dayMode: 'weekdays',
    periodCount: 6,
    periods: Array.from({ length: MAX_PERIODS }, (_, index) => {
      const start = 9 * 60 + index * 100
      const format = (minutes: number) =>
        `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      return { startTime: format(start), endTime: format(start + 90) }
    }),
    academicYear: getAcademicYear(),
    term: 1,
    legacyAcademicYear: getAcademicYear(),
    weeklyStartHour: 0,
  }
}

export function validatePeriodTimes(periods: PeriodTime[], count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PERIODS) {
    return `時限数は1〜${MAX_PERIODS}限で指定してください。`
  }
  for (let index = 0; index < count; index += 1) {
    const period = periods[index]
    if (
      !period ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(period.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(period.endTime)
    ) return `${index + 1}限の開始・終了時刻を入力してください。`
    if (period.startTime >= period.endTime) {
      return `${index + 1}限の終了時刻は開始時刻より後にしてください。`
    }
    if (index > 0 && periods[index - 1].endTime > period.startTime) {
      return `${index + 1}限は、前の時限の終了時刻以降に開始してください。`
    }
  }
  return ''
}

export function isTimetableSettings(value: unknown): value is TimetableSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const settings = value as Record<string, unknown>
  if (
    typeof settings.dayMode !== 'string' ||
    !['weekdays', 'saturday', 'weekend'].includes(settings.dayMode) ||
    !Number.isInteger(settings.periodCount) ||
    Number(settings.periodCount) < 1 || Number(settings.periodCount) > MAX_PERIODS ||
    !isAcademicYear(settings.academicYear) || !isTerm(settings.term) ||
    !isAcademicYear(settings.legacyAcademicYear) ||
    (settings.weeklyStartHour !== undefined && !isWeeklyStartHour(settings.weeklyStartHour)) ||
    !Array.isArray(settings.periods) || settings.periods.length !== MAX_PERIODS
  ) return false
  for (const period of settings.periods) {
    if (typeof period !== 'object' || period === null ||
      typeof period.startTime !== 'string' || typeof period.endTime !== 'string' ||
      validatePeriodTimes([period], 1) !== '') return false
  }
  return validatePeriodTimes(settings.periods, Number(settings.periodCount)) === ''
}

function parseTimetableSettings(value: unknown): TimetableSettings | null {
  if (!isTimetableSettings(value)) return null
  // 開始時刻の項目がない旧形式だけを、表示時に補う。元キーは変更しない。
  return { ...value, weeklyStartHour: value.weeklyStartHour ?? 0 }
}

export function loadTimetableSettingsState(storage?: SafeStorage) {
  return readStoredJson(TIMETABLE_SETTINGS_KEY, '時間割の設定',
    createDefaultTimetableSettings(), parseTimetableSettings, storage)
}

export function loadTimetableSettings(): TimetableSettings {
  // 旧授業の表示用。通常保存と書き出しでは、別途読み込み状態を確認する。
  return loadTimetableSettingsState().data
}

export function saveTimetableSettings(settings: TimetableSettings, storage?: SafeStorage) {
  saveStoredJson(TIMETABLE_SETTINGS_KEY, '時間割の設定', settings,
    parseTimetableSettings, createDefaultTimetableSettings(), storage)
}

export function getYearOptions(...years: number[]) {
  const currentYear = getAcademicYear()
  return [...new Set([
    ...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index),
    ...years,
  ])].filter(isAcademicYear).sort((a, b) => a - b)
}
