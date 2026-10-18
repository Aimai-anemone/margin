import { dayPeriods, getLocalDate, type LoosePlan } from './LoosePlanStorage'

export const DAILY_RECORDS_STORAGE_KEY = 'margin-daily-records'
// iPhoneとiPadの合計を扱えるよう、24時間ではなく48時間まで受け付ける。
export const MAX_DAILY_MINUTES = 48 * 60

export type DailyRecord = {
  date: string
  screenTimeMinutes: number | null
  unintendedMinutes: number | null
  insight: string
  loosePlans: LoosePlan[]
  createdAt: string
  updatedAt: string
}

export type DailyRecordInput = Omit<DailyRecord, 'createdAt' | 'updatedAt'>

export class DailyRecordExistsError extends Error {
  constructor() {
    super('この日の記録は、すでに保存されています。保存済みの内容を表示します。')
    this.name = 'DailyRecordExistsError'
  }
}

export function isValidRecordDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return year > 0 && date.getFullYear() === year &&
    date.getMonth() === month - 1 && date.getDate() === day
}

export function canCreateDailyRecord(date: string) {
  return isValidRecordDate(date) &&
    [0, -1, -2].some((offset) => date === getLocalDate(offset))
}

function isMinutes(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' &&
    Number.isSafeInteger(value) && value >= 0 && value <= MAX_DAILY_MINUTES)
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

function isSavedPlan(value: unknown, date: string): value is LoosePlan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const plan = value as Record<string, unknown>
  return typeof plan.id === 'string' && plan.id.trim() !== '' &&
    typeof plan.title === 'string' && plan.title.trim() !== '' &&
    plan.date === date &&
    dayPeriods.some((period) => period.value === plan.dayPeriod) &&
    typeof plan.memo === 'string' && typeof plan.completed === 'boolean'
}

export function isDailyRecord(value: unknown): value is DailyRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return isValidRecordDate(record.date) &&
    isMinutes(record.screenTimeMinutes) && isMinutes(record.unintendedMinutes) &&
    (record.unintendedMinutes === null ||
      (record.screenTimeMinutes !== null && record.unintendedMinutes <= record.screenTimeMinutes)) &&
    typeof record.insight === 'string' &&
    Array.isArray(record.loosePlans) &&
    record.loosePlans.every((plan) => isSavedPlan(plan, record.date as string)) &&
    isTimestamp(record.createdAt) && isTimestamp(record.updatedAt) &&
    record.createdAt <= record.updatedAt
}

export function isDailyRecords(value: unknown): value is DailyRecord[] {
  return Array.isArray(value) && value.every(isDailyRecord) &&
    new Set(value.map((record) => record.date)).size === value.length
}

export function readDailyRecords(): DailyRecord[] {
  try {
    const savedRecords = localStorage.getItem(DAILY_RECORDS_STORAGE_KEY)
    if (savedRecords === null) return []
    const records: unknown = JSON.parse(savedRecords)
    if (isDailyRecords(records)) return records
  } catch {
    // 読み込みに失敗しても、元の保存内容は残す。
  }
  throw new Error('保存された一日の記録を確認できません。現在の保存内容は変更していません。')
}

export function loadDailyRecords(): { records: DailyRecord[]; error: string } {
  try {
    return { records: readDailyRecords(), error: '' }
  } catch {
    return {
      records: [],
      error: '一日の記録を読み込めません。保存内容は変更せずに残しています。バックアップやブラウザーの保存設定を確認してください。',
    }
  }
}

export function writeDailyRecords(records: DailyRecord[]) {
  if (!isDailyRecords(records)) {
    throw new Error('一日の記録の内容を確認してください。保存は行っていません。')
  }
  try {
    localStorage.setItem(DAILY_RECORDS_STORAGE_KEY, JSON.stringify(records))
  } catch {
    throw new Error('一日の記録を保存できませんでした。端末の空き容量や、ブラウザーの保存設定を確認してください。')
  }
}

export function saveDailyRecord(
  input: DailyRecordInput,
  operation: 'upsert' | 'create' | 'update' = 'upsert',
): DailyRecord[] {
  // 保存直前にも読み直し、壊れたデータを空配列で上書きしない。
  const records = readDailyRecords()
  const existingRecord = records.find((record) => record.date === input.date)
  if (operation === 'create' && existingRecord) throw new DailyRecordExistsError()
  if (operation === 'update' && !existingRecord) {
    throw new Error('この日の記録が見つかりません。一覧へ戻って確認してください。')
  }
  if (!existingRecord && !canCreateDailyRecord(input.date)) {
    throw new Error('新しく記録できるのは、今日・昨日・2日前です。')
  }

  if (operation === 'update' && existingRecord &&
    (input.loosePlans.length !== existingRecord.loosePlans.length ||
      input.loosePlans.some((plan, index) => {
        const savedPlan = existingRecord.loosePlans[index]
        return plan.id !== savedPlan.id || plan.title !== savedPlan.title ||
          plan.date !== savedPlan.date || plan.dayPeriod !== savedPlan.dayPeriod ||
          plan.memo !== savedPlan.memo
      }))) {
    throw new Error('保存された予定の内容が変わっています。記録を開き直してください。')
  }

  const now = new Date().toISOString()
  const nextRecord: DailyRecord = {
    ...input,
    insight: input.insight.trim(),
    loosePlans: input.loosePlans.map((plan) => ({ ...plan })),
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  }
  const nextRecords = existingRecord
    ? records.map((record) => record.date === input.date ? nextRecord : record)
    : [...records, nextRecord]

  writeDailyRecords(nextRecords)
  return nextRecords
}

export function deleteDailyRecord(date: string): DailyRecord[] {
  if (!isValidRecordDate(date)) throw new Error('記録の日付を確認してください。')
  const records = readDailyRecords()
  const nextRecords = records.filter((record) => record.date !== date)
  writeDailyRecords(nextRecords)
  return nextRecords
}

export function parseDurationInput(hours: string, minutes: string, label: string) {
  const hourText = hours.trim()
  const minuteText = minutes.trim()
  if (hourText === '' && minuteText === '') return { minutes: null, error: '' }
  if ((hourText !== '' && !/^\d+$/.test(hourText)) ||
    (minuteText !== '' && !/^\d+$/.test(minuteText))) {
    return { minutes: null, error: `${label}は、0以上の整数で入力してください。` }
  }

  const hourValue = Number(hourText || 0)
  const minuteValue = Number(minuteText || 0)
  if (!Number.isSafeInteger(minuteValue) || minuteValue > 59) {
    return { minutes: null, error: `${label}の分は、0〜59で入力してください。` }
  }
  const totalMinutes = hourValue * 60 + minuteValue
  if (!Number.isSafeInteger(hourValue) || !Number.isSafeInteger(totalMinutes) ||
    totalMinutes > MAX_DAILY_MINUTES) {
    return { minutes: null, error: `${label}は、合計48時間以内で入力してください。` }
  }
  return { minutes: totalMinutes, error: '' }
}
