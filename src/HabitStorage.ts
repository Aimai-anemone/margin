import { restoreBackupValues } from './BackupRestore'
import { isValidRecordDate } from './DailyRecordStorage'
import { getLocalDate } from './LoosePlanStorage'
import {
  readStoredJson, requireStoredData, saveStoredJson, StorageSafetyError, type SafeStorage,
} from './StorageSafety'

export const HABITS_STORAGE_KEY = 'margin-habits'
export const HABIT_RECORDS_STORAGE_KEY = 'margin-habit-records'
export const MAX_HABITS = 100
export const MAX_HABIT_RECORDS = 10000
export const habitWeekdays = ['日', '月', '火', '水', '木', '金', '土'] as const
export const habitSteps = [
  { value: 1, label: '小さく', help: '忙しい日でもできる、最初の一歩' },
  { value: 2, label: 'いつもの', help: '普段取り組みたい内容' },
  { value: 3, label: 'しっかり', help: '余裕がある日に取り組む内容' },
] as const
export type HabitStep = 1 | 2 | 3
export type HabitStatus = 'active' | 'paused' | 'hidden'
export type HabitResult = HabitStep | 'rest'
export type Habit = {
  id: string
  name: string
  steps: Record<HabitStep, string>
  frequency: 'daily' | 'weekdays'
  weekdays: number[]
  trigger: string
  status: HabitStatus
  createdAt: string
  updatedAt: string
}
export type HabitDraft = Pick<Habit, 'name' | 'steps' | 'frequency' | 'weekdays' | 'trigger'>
export type HabitRecord = {
  id: string
  habitId: string
  date: string
  result: HabitResult
  habitName: string
  selectedContent: string | null
  createdAt: string
  updatedAt: string
}
export type HabitData = { habits: Habit[]; records: HabitRecord[] }

// 巻き戻し失敗後は、同じ実行環境の通常操作・書き出しを止める。
// 永続的な処理ログではないため、処理中の強制終了までは保証しない。
const recoveryStores = new WeakSet<SafeStorage>()
const recoveryMessage = '習慣の削除中に問題が発生し、元のデータを完全には戻せなかった可能性があります。アプリを閉じず、新しい習慣操作やバックアップ書き出しを行わないでください。保存済みバックアップを保管し、確認済みのバックアップからの復元を検討してください。'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown, max: number, required = true): value is string {
  if (typeof value !== 'string' || (required && !value.trim())) return false
  let count = 0
  for (const character of value) {
    void character
    if (++count > max) return false
  }
  return true
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

export function parseHabits(value: unknown): Habit[] | null {
  if (!Array.isArray(value) || value.length > MAX_HABITS) return null
  const ids = new Set<string>()
  const habits: Habit[] = []
  for (const item of value) {
    if (!isObject(item) || !isText(item.id, 200) || ids.has(item.id) ||
      !isText(item.name, 200) || !isObject(item.steps) ||
      !isText(item.steps[1], 200) || !isText(item.steps[2], 200) || !isText(item.steps[3], 200) ||
      (item.frequency !== 'daily' && item.frequency !== 'weekdays') ||
      !Array.isArray(item.weekdays) || item.weekdays.length > 7 ||
      !item.weekdays.every((day: unknown) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) ||
      new Set(item.weekdays).size !== item.weekdays.length ||
      (item.frequency === 'daily' ? item.weekdays.length !== 0 : item.weekdays.length === 0) ||
      !isText(item.trigger, 10000, false) ||
      (item.status !== 'active' && item.status !== 'paused' && item.status !== 'hidden') ||
      !isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt) || item.createdAt > item.updatedAt
    ) return null
    ids.add(item.id)
    habits.push({
      id: item.id, name: item.name,
      steps: { 1: item.steps[1], 2: item.steps[2], 3: item.steps[3] },
      frequency: item.frequency, weekdays: [...item.weekdays], trigger: item.trigger,
      status: item.status as HabitStatus, createdAt: item.createdAt, updatedAt: item.updatedAt,
    })
  }
  return habits
}

export function parseHabitRecords(value: unknown): HabitRecord[] | null {
  if (!Array.isArray(value) || value.length > MAX_HABIT_RECORDS) return null
  const ids = new Set<string>()
  const datesByHabit = new Map<string, Set<string>>()
  const records: HabitRecord[] = []
  for (const item of value) {
    if (!isObject(item) || !isText(item.id, 200) || ids.has(item.id) ||
      !isText(item.habitId, 200) || !isValidRecordDate(item.date) ||
      (item.result !== 1 && item.result !== 2 && item.result !== 3 && item.result !== 'rest') ||
      !isText(item.habitName, 200) ||
      (item.result === 'rest' ? item.selectedContent !== null : !isText(item.selectedContent, 200)) ||
      !isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt) || item.createdAt > item.updatedAt
    ) return null
    const dates = datesByHabit.get(item.habitId) ?? new Set<string>()
    if (dates.has(item.date)) return null
    dates.add(item.date)
    datesByHabit.set(item.habitId, dates)
    ids.add(item.id)
    records.push({
      id: item.id, habitId: item.habitId, date: item.date, result: item.result,
      habitName: item.habitName, selectedContent: item.selectedContent as string | null,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    })
  }
  return records
}

export function hasValidHabitRelations(habits: Habit[], records: HabitRecord[]) {
  const ids = new Set(habits.map((habit) => habit.id))
  return records.every((record) => ids.has(record.habitId))
}

export const loadHabitState = (storage?: SafeStorage) =>
  readStoredJson(HABITS_STORAGE_KEY, '習慣', [], parseHabits, storage)
export const loadHabitRecordState = (storage?: SafeStorage) =>
  readStoredJson(HABIT_RECORDS_STORAGE_KEY, '習慣実績', [], parseHabitRecords, storage)

export function habitRecoveryRequired(storage?: SafeStorage) {
  try { return recoveryStores.has(storage ?? localStorage) } catch { return false }
}

export function clearHabitRecoveryAfterRestore(storage?: SafeStorage) {
  recoveryStores.delete(storage ?? localStorage)
}

export function markHabitRecoveryRequired(storage?: SafeStorage) {
  recoveryStores.add(storage ?? localStorage)
}

export function readHabitData(storage?: SafeStorage): HabitData {
  if (habitRecoveryRequired(storage)) throw new StorageSafetyError('unreadable', recoveryMessage)
  const habits = requireStoredData(loadHabitState(storage))
  const records = requireStoredData(loadHabitRecordState(storage))
  if (!hasValidHabitRelations(habits, records)) {
    throw new StorageSafetyError('unreadable', '習慣と実績の対応を確認できません。保存内容は変更せず、設定タブでバックアップを確認してください。')
  }
  return { habits, records }
}

export function loadHabitData() {
  try { return { data: readHabitData(), error: '' } } catch (error) {
    return { data: { habits: [], records: [] } as HabitData,
      error: error instanceof StorageSafetyError ? error.message : '習慣の保存データを読み込めませんでした。保存内容を変更せず、バックアップを確認してください。' }
  }
}

function invalid(message = '習慣の入力内容・文字数・曜日を確認してください。保存は行っていません。'): never {
  throw new StorageSafetyError('invalid', message)
}

export function saveHabit(draft: HabitDraft, id?: string, storage?: SafeStorage): HabitData {
  const current = readHabitData(storage)
  const existing = id === undefined ? undefined : current.habits.find((habit) => habit.id === id)
  if (id !== undefined && (!existing || existing.status === 'hidden')) invalid('編集する習慣を確認してください。保存は行っていません。')
  if (!existing && current.habits.length >= MAX_HABITS) invalid('習慣は100件まで保存できます。新しい習慣を保存する前に、非表示の習慣を整理してください。')
  const now = new Date().toISOString()
  const next: Habit = {
    id: existing?.id ?? crypto.randomUUID(), name: draft.name.trim(),
    steps: { 1: draft.steps[1].trim(), 2: draft.steps[2].trim(), 3: draft.steps[3].trim() },
    frequency: draft.frequency,
    weekdays: draft.frequency === 'daily' ? [] : [...draft.weekdays].sort((a, b) => a - b),
    trigger: draft.trigger.trim(), status: existing?.status ?? 'active',
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  }
  const habits = existing ? current.habits.map((habit) => habit.id === existing.id ? next : habit) : [...current.habits, next]
  if (!parseHabits(habits)) invalid()
  saveStoredJson(HABITS_STORAGE_KEY, '習慣', habits, parseHabits, [], storage)
  return { ...current, habits }
}

export function changeHabitStatus(id: string, status: HabitStatus, storage?: SafeStorage): HabitData {
  const current = readHabitData(storage)
  const existing = current.habits.find((habit) => habit.id === id)
  if (!existing || !(existing.status === 'hidden' ? status === 'paused'
    : existing.status === 'active' ? status === 'paused' || status === 'hidden'
    : status === 'active' || status === 'hidden')) invalid('習慣の状態を確認してください。保存は行っていません。')
  const habits = current.habits.map((habit) => habit.id === id
    ? { ...habit, status, updatedAt: new Date().toISOString() } : habit)
  saveStoredJson(HABITS_STORAGE_KEY, '習慣', habits, parseHabits, [], storage)
  return { ...current, habits }
}

export function deleteHiddenHabit(id: string, storage?: SafeStorage): HabitData {
  const current = readHabitData(storage)
  if (current.habits.find((habit) => habit.id === id)?.status !== 'hidden') invalid('完全削除できるのは、非表示にした習慣だけです。')
  const habits = current.habits.filter((habit) => habit.id !== id)
  const records = current.records.filter((record) => record.habitId !== id)
  if (!parseHabits(habits) || !parseHabitRecords(records) || !hasValidHabitRelations(habits, records)) invalid()
  const result = restoreBackupValues([
    { key: HABITS_STORAGE_KEY, value: JSON.stringify(habits) },
    { key: HABIT_RECORDS_STORAGE_KEY, value: JSON.stringify(records) },
  ], storage)
  if (result.status !== 'success') {
    if (result.status === 'rollback-failed') {
      markHabitRecoveryRequired(storage)
      throw new StorageSafetyError('unreadable', recoveryMessage)
    }
    const quota = result.status === 'rolled-back' && result.quotaExceeded
    throw new StorageSafetyError(quota ? 'quota' : 'write',
      `習慣を完全削除できませんでした。元のデータは維持されています。${quota ? '保存容量が不足している可能性があります。' : ''}ブラウザーの保存設定を確認し、もう一度お試しください。`)
  }
  return { habits, records }
}

// 第3段階の実績UIから利用する保存窓口。現在はUIに接続しない。
export function writeHabitRecords(records: HabitRecord[], storage?: SafeStorage): HabitData {
  const current = readHabitData(storage)
  const checked = parseHabitRecords(records)
  if (!checked || !hasValidHabitRelations(current.habits, checked)) invalid('習慣実績の内容・件数・日付・習慣との対応を確認してください。保存は行っていません。')
  saveStoredJson(HABIT_RECORDS_STORAGE_KEY, '習慣実績', checked, parseHabitRecords, [], storage)
  return { habits: current.habits, records: checked }
}

function requireRecentDate(date: string) {
  if (!isValidRecordDate(date) || ![0, -1, -2].some((offset) => date === getLocalDate(offset))) {
    invalid('習慣を記録できるのは、今日・昨日・一昨日です。')
  }
}

export function saveHabitRecord(habitId: string, date: string, result: HabitResult, storage?: SafeStorage): HabitData {
  requireRecentDate(date)
  const current = readHabitData(storage)
  const habit = current.habits.find((item) => item.id === habitId)
  if (!habit) invalid('対象の習慣が見つかりません。保存は行っていません。')
  const existing = current.records.find((record) => record.habitId === habitId && record.date === date)
  const now = new Date().toISOString()
  const record: HabitRecord = {
    id: existing?.id ?? crypto.randomUUID(), habitId, date, result,
    habitName: habit.name, selectedContent: result === 'rest' ? null : habit.steps[result],
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  }
  return writeHabitRecords(existing ? current.records.map((item) => item.id === existing.id ? record : item)
    : [...current.records, record], storage)
}

export function cancelHabitRecord(habitId: string, date: string, storage?: SafeStorage): HabitData {
  requireRecentDate(date)
  const current = readHabitData(storage)
  return writeHabitRecords(current.records.filter((record) => record.habitId !== habitId || record.date !== date), storage)
}
