import { isValidCourseBackup } from './CourseStorage'
import { isDailyRecords, isValidRecordDate, type DailyRecord } from './DailyRecordStorage'
import { isFiveMinuteCounts, type FiveMinuteCount } from './FiveMinuteStorage'
import { isValidTaskDeadline } from './TaskStorage'
import { isTimetableSettings, type TimetableSettings } from './TimetableStorage'
import { parseHabits, parseHabitRecords, hasValidHabitRelations, type Habit, type HabitRecord } from './HabitStorage'

export const MAX_BACKUP_FILE_SIZE = 5 * 1024 * 1024
const SHORT_TEXT_LIMIT = 200
const LONG_TEXT_LIMIT = 10000

export type BackupData = {
  version: 1
  createdAt: string
  entry: string
  tasks: unknown[]
  courses: unknown[]
  loosePlans?: unknown[]
  timetableSettings?: TimetableSettings
  dailyRecords?: DailyRecord[]
  weeklySchedules?: unknown[]
  fiveMinuteStarts?: FiveMinuteCount[]
  habits?: Habit[]
  habitRecords?: HabitRecord[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidTask(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.title === 'string' && typeof value.deadline === 'string' &&
    typeof value.format === 'string' && typeof value.firstStep === 'string' &&
    typeof value.completed === 'boolean'
}

function isValidLoosePlan(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.title === 'string' && typeof value.date === 'string' &&
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value.date) &&
    (value.dayPeriod === 'morning' || value.dayPeriod === 'afternoon' || value.dayPeriod === 'evening') &&
    typeof value.memo === 'string' && typeof value.completed === 'boolean'
}

function isValidWeeklySchedule(value: unknown) {
  if (!isRecord(value)) return false
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  return typeof value.id === 'string' && value.id.trim() !== '' &&
    typeof value.title === 'string' && value.title.trim() !== '' &&
    typeof value.weekday === 'string' &&
    ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'].includes(value.weekday) &&
    typeof value.startTime === 'string' && timePattern.test(value.startTime) &&
    typeof value.endTime === 'string' && timePattern.test(value.endTime) &&
    value.startTime < value.endTime &&
    (value.memo === undefined || typeof value.memo === 'string') &&
    (value.color === undefined ||
      (typeof value.color === 'string' && ['green', 'red', 'blue', 'amber', 'purple'].includes(value.color)))
}

// 書き出しは従来の検証を維持し、制限を超える既存データも退避できるようにする。
export function isValidBackupData(value: unknown): value is BackupData {
  return isRecord(value) && value.version === 1 &&
    validBackupHabits(value) &&
    typeof value.createdAt === 'string' && typeof value.entry === 'string' &&
    Array.isArray(value.tasks) && value.tasks.every(isValidTask) &&
    Array.isArray(value.courses) && value.courses.every(isValidCourseBackup) &&
    (value.timetableSettings === undefined || isTimetableSettings(value.timetableSettings)) &&
    (value.loosePlans === undefined || (Array.isArray(value.loosePlans) && value.loosePlans.every(isValidLoosePlan))) &&
    (value.dailyRecords === undefined || isDailyRecords(value.dailyRecords)) &&
    (value.fiveMinuteStarts === undefined || isFiveMinuteCounts(value.fiveMinuteStarts)) &&
    (value.weeklySchedules === undefined ||
      (Array.isArray(value.weeklySchedules) && value.weeklySchedules.every(isValidWeeklySchedule)))
}

function validBackupHabits(value: Record<string, unknown>) {
  const hasHabits = Object.hasOwn(value, 'habits')
  const hasRecords = Object.hasOwn(value, 'habitRecords')
  if (!hasHabits && !hasRecords) return true
  if (!hasHabits || !hasRecords) return false
  const habits = parseHabits(value.habits)
  const records = parseHabitRecords(value.habitRecords)
  return habits !== null && records !== null && hasValidHabitRelations(habits, records)
}

type TextRule = { field: string; label: string; max: number }
const shortText = (field: string, label: string): TextRule => ({ field, label, max: SHORT_TEXT_LIMIT })
const longText = (field: string, label: string): TextRule => ({ field, label, max: LONG_TEXT_LIMIT })
const planTextRules = [shortText('id', 'ID'), shortText('title', '予定名'), longText('memo', 'メモ')]

type CollectionRule = {
  key: string
  label: string
  max: number
  optional?: boolean
  hasIds?: boolean
  text: TextRule[]
  validate: (items: unknown[]) => boolean
}

const collectionRules: CollectionRule[] = [
  { key: 'tasks', label: '課題', max: 5000, hasIds: true,
    text: [shortText('id', 'ID'), shortText('title', '課題名'), shortText('format', '課題形式'), longText('firstStep', '最初の入口')],
    validate: (items) => items.every(isValidTask) },
  { key: 'courses', label: '授業', max: 1000, hasIds: true,
    text: [shortText('id', 'ID'), shortText('name', '授業名'), shortText('classroom', '教室'), shortText('teacher', '教員名'),
      shortText('weekday', '曜日'), shortText('period', '時限'), shortText('defaultFormat', '標準の課題形式'), longText('defaultFirstStep', '標準の最初の入口')],
    validate: (items) => items.every(isValidCourseBackup) },
  { key: 'loosePlans', label: 'ゆるい予定', max: 5000, optional: true, hasIds: true,
    text: planTextRules, validate: (items) => items.every(isValidLoosePlan) },
  { key: 'weeklySchedules', label: '週間予定', max: 2000, optional: true, hasIds: true,
    text: [shortText('id', 'ID'), shortText('title', '予定名'), longText('memo', 'メモ')],
    validate: (items) => items.every(isValidWeeklySchedule) },
  { key: 'dailyRecords', label: '日次記録', max: 3000, optional: true,
    text: [longText('insight', '気づき')], validate: isDailyRecords },
  { key: 'fiveMinuteStarts', label: '5分着手の日別回数', max: 3000, optional: true,
    text: [], validate: isFiveMinuteCounts },
]

function fitsTextLimit(value: string, max: number) {
  if (value.length <= max) return true
  // 絵文字のサロゲートペアを分割しない。結合文字も数え、巨大な結合列での回避を防ぐ。
  let length = 0
  let offset = 0
  while (offset < value.length) {
    const codePoint = value.codePointAt(offset)
    offset += codePoint !== undefined && codePoint > 0xffff ? 2 : 1
    length += 1
    if (length > max) return false
  }
  return true
}

function textError(value: Record<string, unknown>, rules: TextRule[], label: string) {
  for (const rule of rules) {
    const text = value[rule.field]
    if (typeof text === 'string' && !fitsTextLimit(text, rule.max)) {
      return `${label}の「${rule.label}」は${rule.max.toLocaleString('ja-JP')}文字以下にしてください。復元は行っていません。`
    }
  }
  return ''
}

function idError(items: unknown[], label: string) {
  const ids = new Set<string>()
  for (const item of items) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.trim() === '') {
      return `${label}のIDを確認してください。空のIDは復元できません。復元は行っていません。`
    }
    if (ids.has(item.id)) return `${label}のIDが重複しています。復元は行っていません。`
    ids.add(item.id)
  }
  return ''
}

function validateRestoreData(value: unknown) {
  if (!isRecord(value)) return 'Marginの正しいバックアップファイルではありません。復元は行っていません。'
  if (!validBackupHabits(value)) return '習慣と習慣実績の両方が必要です。件数・文字数・曜日・日時・IDの重複・実績と習慣の対応も確認してください。復元は行っていません。'
  const entryError = textError(value, [longText('entry', '今日の入口'), shortText('createdAt', '作成日時')], 'バックアップ')
  if (entryError) return entryError
  for (const rule of collectionRules) {
    const items: unknown = value[rule.key]
    if (items === undefined && rule.optional) continue
    if (!Array.isArray(items)) return `${rule.label}の一覧形式を確認してください。復元は行っていません。`
    if (items.length > rule.max) return `${rule.label}が多すぎます。${rule.max.toLocaleString('ja-JP')}件以下のバックアップを選んでください。復元は行っていません。`
    if (rule.hasIds) {
      const error = idError(items, rule.label)
      if (error) return error
    }
    for (const item of items) {
      if (!isRecord(item)) return `${rule.label}の内容を確認してください。復元は行っていません。`
      const error = textError(item, rule.text, rule.label)
      if (error) return error
      if (rule.key === 'tasks' && !isValidTaskDeadline(item.deadline)) {
        return '課題の締切に実在しない日時、または正しくない形式があります。復元は行っていません。'
      }
      if (rule.key === 'loosePlans' && !isValidRecordDate(item.date)) {
        return 'ゆるい予定の日付に実在しない日付、または正しくない形式があります。復元は行っていません。'
      }
      if (rule.key === 'dailyRecords' && Array.isArray(item.loosePlans)) {
        if (item.loosePlans.length > 5000) return '日次記録に含まれるゆるい予定が多すぎます。1日分は5,000件以下にしてください。復元は行っていません。'
        const planIdError = idError(item.loosePlans, '日次記録に含まれるゆるい予定')
        if (planIdError) return planIdError
        for (const plan of item.loosePlans) {
          if (isRecord(plan)) {
            const planError = textError(plan, planTextRules, '日次記録に含まれるゆるい予定')
            if (planError) return planError
          }
        }
      }
    }
    if (!rule.validate(items)) return `${rule.label}の形式、日付、時刻または設定値を確認してください。復元は行っていません。`
  }
  return ''
}

function pickFields(value: unknown, fields: string[]): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('検証済みデータを確認できません。')
  const picked: Record<string, unknown> = {}
  for (const field of fields) {
    if (Object.hasOwn(value, field) && value[field] !== undefined) picked[field] = value[field]
  }
  return picked
}

function pickPlan(plan: DailyRecord['loosePlans'][number]) {
  return { id: plan.id, title: plan.title, date: plan.date, dayPeriod: plan.dayPeriod, memo: plan.memo, completed: plan.completed }
}

function pickBackupFields(data: BackupData): BackupData {
  const settings = data.timetableSettings
  return {
    version: 1, createdAt: data.createdAt, entry: data.entry,
    ...(data.habits === undefined ? {} : {
      habits: parseHabits(data.habits)!, habitRecords: parseHabitRecords(data.habitRecords)!,
    }),
    tasks: data.tasks.map((task) => pickFields(task, ['id', 'title', 'deadline', 'format', 'firstStep', 'completed'])),
    courses: data.courses.map((course) => {
      const picked = pickFields(course, ['id', 'name', 'weekday', 'period', 'defaultFormat', 'defaultFirstStep', 'classroom', 'teacher', 'academicYear', 'term'])
      if (isRecord(course) && course.legacyPlacement !== undefined) {
        picked.legacyPlacement = pickFields(course.legacyPlacement, ['weekday', 'period'])
      }
      return picked
    }),
    ...(data.loosePlans === undefined ? {} : {
      loosePlans: data.loosePlans.map((plan) => pickFields(plan, ['id', 'title', 'date', 'dayPeriod', 'memo', 'completed'])),
    }),
    ...(settings === undefined ? {} : { timetableSettings: {
      dayMode: settings.dayMode, periodCount: settings.periodCount,
      periods: settings.periods.map((period) => ({ startTime: period.startTime, endTime: period.endTime })),
      academicYear: settings.academicYear, term: settings.term, legacyAcademicYear: settings.legacyAcademicYear,
      ...(settings.weeklyStartHour === undefined ? {} : { weeklyStartHour: settings.weeklyStartHour }),
    } }),
    ...(data.dailyRecords === undefined ? {} : { dailyRecords: data.dailyRecords.map((record) => ({
      date: record.date, screenTimeMinutes: record.screenTimeMinutes, unintendedMinutes: record.unintendedMinutes,
      insight: record.insight, loosePlans: record.loosePlans.map(pickPlan), createdAt: record.createdAt, updatedAt: record.updatedAt,
    })) }),
    ...(data.weeklySchedules === undefined ? {} : {
      weeklySchedules: data.weeklySchedules.map((schedule) => pickFields(schedule, ['id', 'title', 'weekday', 'startTime', 'endTime', 'memo', 'color'])),
    }),
    ...(data.fiveMinuteStarts === undefined ? {} : {
      fiveMinuteStarts: data.fiveMinuteStarts.map((count) => ({ date: count.date, count: count.count })),
    }),
  }
}

export function prepareBackupForRestore(value: unknown): { data: BackupData; error?: never } | { data?: never; error: string } {
  const error = validateRestoreData(value)
  if (error) return { error }
  if (!isValidBackupData(value)) return { error: 'バックアップの形式または時間割設定を確認してください。復元は行っていません。' }
  // 許可した項目だけ取り出し、特殊キーを含む追加プロパティは保存へ渡さない。
  return { data: pickBackupFields(value) }
}
