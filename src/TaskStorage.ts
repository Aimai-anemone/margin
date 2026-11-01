import { readStoredJson, saveStoredJson, type SafeStorage } from './StorageSafety'

export const TASKS_STORAGE_KEY = 'margin-tasks'

export type Task = {
  id: string
  title: string
  deadline: string
  format: string
  firstStep: string
  completed: boolean
}

function parseTaskDeadline(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  // datetime-localの保存形式。秒・小数秒を持つ正常な旧データも受け付ける。
  const parts = /^(\d{4,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value)
  if (!parts) return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', fraction = '0'] = parts
  const [year, month, day, hour, minute, second, millisecond] = [
    yearText, monthText, dayText, hourText, minuteText, secondText, fraction.padEnd(3, '0'),
  ].map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59) return null
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(hour, minute, second, millisecond)
  return Number.isFinite(date.getTime()) && date.getFullYear() === year &&
    date.getMonth() === month - 1 && date.getDate() === day &&
    date.getHours() === hour && date.getMinutes() === minute &&
    date.getSeconds() === second && date.getMilliseconds() === millisecond ? date : null
}

export function isValidTaskDeadline(value: unknown): value is string {
  return value === '' || parseTaskDeadline(value) !== null
}

export function formatTaskDeadline(value: string, emptyText = '締切は未設定です') {
  if (value === '') return emptyText
  const date = parseTaskDeadline(value)
  if (!date) return '締切の情報を確認してください'
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function parseTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) return null
  const tasks: Task[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
    const task = item as Record<string, unknown>
    if (typeof task.id !== 'string' || !task.id.trim() || ids.has(task.id) ||
      typeof task.title !== 'string' || typeof task.deadline !== 'string' ||
      typeof task.format !== 'string' || typeof task.firstStep !== 'string' ||
      (task.completed !== undefined && typeof task.completed !== 'boolean')) return null
    ids.add(task.id)
    tasks.push({ ...task, id: task.id, title: task.title, deadline: task.deadline,
      format: task.format, firstStep: task.firstStep, completed: task.completed ?? false })
  }
  return tasks
}

export const loadTaskState = (storage?: SafeStorage) => readStoredJson(TASKS_STORAGE_KEY, '課題', [], parseTasks, storage)
// 5分着手の読み取り専用一覧との互換性を維持する。保存・書き出しには結果全体を使う。
export const loadTasks = () => loadTaskState().data
export const writeTasks = (tasks: Task[], storage?: SafeStorage) => saveStoredJson(TASKS_STORAGE_KEY, '課題', tasks, parseTasks, [], storage)

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstTime = parseTaskDeadline(firstTask.deadline)?.getTime() ?? null
    const secondTime = parseTaskDeadline(secondTask.deadline)?.getTime() ?? null
    // 未設定・不正な締切は末尾へまとめ、同じ扱いの課題は元の順番を保つ。
    if (firstTime === null && secondTime === null) return 0
    if (firstTime === null) return 1
    if (secondTime === null) return -1
    return firstTime - secondTime
  })
}
