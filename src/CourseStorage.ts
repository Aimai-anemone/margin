import {
  courseWeekdays, isAcademicYear, isTerm, loadTimetableSettings, type Term,
} from './TimetableStorage'
import { readStoredJson, saveStoredJson, type SafeStorage } from './StorageSafety'

export const COURSES_STORAGE_KEY = 'margin-courses'

export type Course = {
  id: string
  name: string
  weekday: string
  period: string
  defaultFormat: string
  defaultFirstStep: string
  classroom: string
  teacher: string
  academicYear: number
  term: Term
  legacyPlacement?: { weekday: string; period: string }
}

export function isCourseWeekday(value: unknown): value is string {
  return typeof value === 'string' && (
    value === '' || value === 'その他' || courseWeekdays.some((day) => day === value)
  )
}

export function isCoursePeriod(value: unknown): value is string {
  return typeof value === 'string' && (
    value === '' || value === 'その他' || /^[1-9]\d?限$/.test(value)
  )
}

export function isValidCourseBackup(value: unknown) {
  if (!isRecord(value)) return false
  const isLegacy = value.academicYear === undefined && value.term === undefined
  const preservedPlacement = isRecord(value.legacyPlacement) &&
    typeof value.legacyPlacement.weekday === 'string' &&
    typeof value.legacyPlacement.period === 'string' &&
    value.legacyPlacement.weekday === value.weekday &&
    value.legacyPlacement.period === value.period
  return (
    typeof value.id === 'string' && typeof value.name === 'string' &&
    typeof value.weekday === 'string' && typeof value.period === 'string' &&
    typeof value.defaultFormat === 'string' && typeof value.defaultFirstStep === 'string' &&
    (value.classroom === undefined || typeof value.classroom === 'string') &&
    (value.teacher === undefined || typeof value.teacher === 'string') &&
    (value.academicYear === undefined || isAcademicYear(value.academicYear)) &&
    (value.term === undefined || isTerm(value.term)) &&
    (value.legacyPlacement === undefined || preservedPlacement) &&
    (isLegacy || preservedPlacement || (isCourseWeekday(value.weekday) && isCoursePeriod(value.period)))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

export function parseCourse(
  value: unknown,
  legacyYear = loadTimetableSettings().legacyAcademicYear,
): Course | null {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }

  return {
    ...value,
    ...(value.academicYear === undefined && value.term === undefined &&
      (!isCourseWeekday(value.weekday) || !isCoursePeriod(value.period))
      ? { legacyPlacement: {
          weekday: typeof value.weekday === 'string' ? value.weekday : '',
          period: typeof value.period === 'string' ? value.period : '',
        } }
      : {}),
    id: value.id,
    name: value.name,
    classroom: typeof value.classroom === 'string' ? value.classroom : '',
    teacher: typeof value.teacher === 'string' ? value.teacher : '',
    academicYear: isAcademicYear(value.academicYear) ? value.academicYear : legacyYear,
    term: isTerm(value.term) ? value.term : 1,
    weekday: typeof value.weekday === 'string' ? value.weekday : '',
    period: typeof value.period === 'string' ? value.period : '',
    defaultFormat:
      typeof value.defaultFormat === 'string'
        ? value.defaultFormat
        : '学校のWebシステム',
    defaultFirstStep:
      typeof value.defaultFirstStep === 'string'
        ? value.defaultFirstStep
        : '',
  }
}

function parseCourses(value: unknown): Course[] | null {
  if (!Array.isArray(value)) return null
  const courses: Course[] = []
  const ids = new Set<string>()
  const legacyYear = loadTimetableSettings().legacyAcademicYear
  for (const item of value) {
    if (!isValidCourseBackup(item)) return null
    const course = parseCourse(item, legacyYear)
    if (!course || course.id.trim() === '' || ids.has(course.id)) return null
    ids.add(course.id)
    courses.push(course)
  }
  return courses
}

export function loadCourseState(storage?: SafeStorage) {
  return readStoredJson(COURSES_STORAGE_KEY, '授業', [] as Course[], parseCourses, storage)
}

export function saveCourses(courses: Course[], storage?: SafeStorage) {
  saveStoredJson(COURSES_STORAGE_KEY, '授業', courses, parseCourses, [], storage)
}

