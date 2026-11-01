import { readStoredJson, saveStoredJson, type SafeStorage } from './StorageSafety'

export const LOOSE_PLANS_STORAGE_KEY = 'margin-loose-plans'

export const dayPeriods = [
  { value: 'morning', label: '朝' },
  { value: 'afternoon', label: '昼' },
  { value: 'evening', label: '夜' },
] as const

export type DayPeriod = (typeof dayPeriods)[number]['value']

export type LoosePlan = {
  id: string
  title: string
  date: string
  dayPeriod: DayPeriod
  memo: string
  completed: boolean
}

function isDayPeriod(value: unknown): value is DayPeriod {
  return dayPeriods.some((dayPeriod) => dayPeriod.value === value)
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function parseLoosePlan(value: unknown): LoosePlan | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null
  }

  const plan = value as Record<string, unknown>

  if (
    typeof plan.id !== 'string' || !plan.id.trim() ||
    typeof plan.title !== 'string' ||
    !isLocalDate(plan.date) ||
    !isDayPeriod(plan.dayPeriod) ||
    typeof plan.completed !== 'boolean' ||
    (plan.memo !== undefined && typeof plan.memo !== 'string')
  ) {
    return null
  }

  return {
    id: plan.id,
    title: plan.title,
    date: plan.date,
    dayPeriod: plan.dayPeriod,
    memo: typeof plan.memo === 'string' ? plan.memo : '',
    completed: plan.completed,
  }
}

function parseLoosePlans(value: unknown): LoosePlan[] | null {
  if (!Array.isArray(value)) return null
  const plans: LoosePlan[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const plan = parseLoosePlan(item)
    if (!plan || ids.has(plan.id)) return null
    ids.add(plan.id)
    plans.push(plan)
  }
  return plans
}

export const loadLoosePlanState = (storage?: SafeStorage) => readStoredJson(LOOSE_PLANS_STORAGE_KEY, 'ゆるい予定', [], parseLoosePlans, storage)
export const writeLoosePlans = (plans: LoosePlan[], storage?: SafeStorage) => saveStoredJson(LOOSE_PLANS_STORAGE_KEY, 'ゆるい予定', plans, parseLoosePlans, [], storage)

export function getLocalDate(daysFromToday = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}
