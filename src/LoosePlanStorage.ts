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
  return (
    typeof value === 'string' &&
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(
      value,
    )
  )
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
    typeof plan.id !== 'string' ||
    typeof plan.title !== 'string' ||
    !isLocalDate(plan.date) ||
    !isDayPeriod(plan.dayPeriod) ||
    typeof plan.completed !== 'boolean'
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

export function loadLoosePlans(): LoosePlan[] {
  const savedPlans = localStorage.getItem(LOOSE_PLANS_STORAGE_KEY)

  if (savedPlans === null) {
    return []
  }

  try {
    const parsedPlans: unknown = JSON.parse(savedPlans)

    if (!Array.isArray(parsedPlans)) {
      return []
    }

    return parsedPlans
      .map(parseLoosePlan)
      .filter((plan): plan is LoosePlan => plan !== null)
  } catch {
    return []
  }
}

export function getLocalDate(daysFromToday = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}
