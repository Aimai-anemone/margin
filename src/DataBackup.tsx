import {
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { isValidCourseBackup, parseCourse } from './CourseStorage'
import {
  hasFiveMinuteCounts, isFiveMinuteCounts, readFiveMinuteCounts, restoreFiveMinuteCounts,
  type FiveMinuteCount,
} from './FiveMinuteStorage'
import {
  DAILY_RECORDS_STORAGE_KEY,
  isDailyRecords,
  readDailyRecords,
  writeDailyRecords,
  type DailyRecord,
} from './DailyRecordStorage'
import {
  TIMETABLE_SETTINGS_KEY,
  createDefaultTimetableSettings,
  isTimetableSettings,
  loadTimetableSettings,
  type TimetableSettings,
} from './TimetableStorage'
const ENTRY_STORAGE_KEY = 'margin-entry'
const TASKS_STORAGE_KEY = 'margin-tasks'
const COURSES_STORAGE_KEY = 'margin-courses'
const LOOSE_PLANS_STORAGE_KEY = 'margin-loose-plans'
const WEEKLY_SCHEDULES_STORAGE_KEY = 'margin-weekly-schedules'

type BackupData = {
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
}

function readSavedArray(storageKey: string, rejectInvalid = false): unknown[] {
  const savedValue = localStorage.getItem(storageKey)

  if (savedValue === null) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)

    if (!Array.isArray(parsedValue)) {
      if (rejectInvalid) throw new Error('保存データを確認できません。')
      return []
    }

    return parsedValue
  } catch {
    if (rejectInvalid) {
      throw new Error('保存された週間予定を読み込めないため、書き出しを中止しました。保存内容は変更していません。')
    }
    return []
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isValidTask(value: unknown) {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.deadline === 'string' &&
    typeof value.format === 'string' &&
    typeof value.firstStep === 'string' &&
    typeof value.completed === 'boolean'
  )
}

function isValidLoosePlan(value: unknown) {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.date === 'string' &&
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value.date) &&
    (value.dayPeriod === 'morning' ||
      value.dayPeriod === 'afternoon' ||
      value.dayPeriod === 'evening') &&
    typeof value.memo === 'string' &&
    typeof value.completed === 'boolean'
  )
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

function isValidBackupData(
  value: unknown,
): value is BackupData {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.version === 1 &&
    typeof value.createdAt === 'string' &&
    typeof value.entry === 'string' &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isValidTask) &&
    Array.isArray(value.courses) &&
    value.courses.every(isValidCourseBackup) &&
    (value.timetableSettings === undefined || isTimetableSettings(value.timetableSettings)) &&
    (value.loosePlans === undefined ||
      (Array.isArray(value.loosePlans) &&
        value.loosePlans.every(isValidLoosePlan))) &&
    (value.dailyRecords === undefined || isDailyRecords(value.dailyRecords)) &&
    (value.fiveMinuteStarts === undefined || isFiveMinuteCounts(value.fiveMinuteStarts)) &&
    (value.weeklySchedules === undefined ||
      (Array.isArray(value.weeklySchedules) && value.weeklySchedules.every(isValidWeeklySchedule)))
  )
}

function createBackupData(): BackupData {
  const timetableSettings = loadTimetableSettings()
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    entry:
      localStorage.getItem(ENTRY_STORAGE_KEY) ?? '',
    tasks: readSavedArray(TASKS_STORAGE_KEY),
    courses: readSavedArray(COURSES_STORAGE_KEY).map((course) =>
      parseCourse(course, timetableSettings.legacyAcademicYear) ?? course),
    loosePlans: readSavedArray(LOOSE_PLANS_STORAGE_KEY),
    timetableSettings,
    dailyRecords: readDailyRecords(),
    weeklySchedules: readSavedArray(WEEKLY_SCHEDULES_STORAGE_KEY, true),
    fiveMinuteStarts: readFiveMinuteCounts(),
  }
}

function downloadBackup() {
  const backupData = createBackupData()
  if (!isValidBackupData(backupData)) {
    throw new Error('保存されたデータに確認が必要な内容があるため、書き出しを中止しました。保存内容は変更していません。')
  }

  const backupText = JSON.stringify(
    backupData,
    null,
    2,
  )

  const backupFile = new Blob([backupText], {
    type: 'application/json',
  })

  const downloadUrl = URL.createObjectURL(backupFile)
  const downloadLink = document.createElement('a')

  const dateText = new Date()
    .toISOString()
    .slice(0, 10)

  downloadLink.href = downloadUrl
  downloadLink.download =
    `margin-backup-${dateText}.json`

  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  URL.revokeObjectURL(downloadUrl)
}

function DataBackup() {
  const restoreInputRef =
    useRef<HTMLInputElement>(null)

  const [restoreMessage, setRestoreMessage] =
    useState('')

async function restoreBackup(
  event: ChangeEvent<HTMLInputElement>,
) {
  const selectedFile = event.target.files?.[0]

  if (selectedFile === undefined) {
    return
  }

  try {
    const backupText = await selectedFile.text()
    const parsedBackup: unknown =
      JSON.parse(backupText)

    if (!isValidBackupData(parsedBackup)) {
      setRestoreMessage(
        'Marginの正しいバックアップファイルではありません。',
      )
      return
    }

    const warnings: string[] = []
    if (parsedBackup.dailyRecords === undefined && readSavedArray(DAILY_RECORDS_STORAGE_KEY).length > 0) {
      warnings.push('このバックアップには一日の記録が含まれていません。復元すると、現在この端末に保存されている一日の記録は削除されます。')
    }
    if (parsedBackup.weeklySchedules === undefined && readSavedArray(WEEKLY_SCHEDULES_STORAGE_KEY).length > 0) {
      warnings.push('このバックアップには週間予定が含まれていません。復元すると、現在この端末に保存されている週間予定は削除されます。')
    }
    if (parsedBackup.fiveMinuteStarts === undefined && hasFiveMinuteCounts()) {
      warnings.push('このバックアップには5分の着手記録が含まれていません。復元すると、現在この端末に保存されている着手回数は削除されます。')
    }
    const shouldRestore = window.confirm([
      '現在の今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定、一日の記録、週間予定、5分の着手回数をバックアップの内容で置き換えますか？\n進行中の5分タイマーは終了します。',
      ...warnings,
    ].join('\n\n'))

    if (!shouldRestore) {
      setRestoreMessage(
        '復元をキャンセルしました。',
      )
      return
    }

    const restoredSettings = parsedBackup.timetableSettings ?? createDefaultTimetableSettings()
    const restoredCourses = parsedBackup.courses.map((course) =>
      parseCourse(course, restoredSettings.legacyAcademicYear),
    )

    if (parsedBackup.entry === '') {
      localStorage.removeItem(ENTRY_STORAGE_KEY)
    } else {
      localStorage.setItem(
        ENTRY_STORAGE_KEY,
        parsedBackup.entry,
      )
    }

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(parsedBackup.tasks),
    )

    localStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify(restoredCourses),
    )

    localStorage.setItem(TIMETABLE_SETTINGS_KEY, JSON.stringify(restoredSettings))

    localStorage.setItem(
      LOOSE_PLANS_STORAGE_KEY,
      JSON.stringify(parsedBackup.loosePlans ?? []),
    )

    writeDailyRecords(parsedBackup.dailyRecords ?? [])
    restoreFiveMinuteCounts(parsedBackup.fiveMinuteStarts ?? [])
    localStorage.setItem(
      WEEKLY_SCHEDULES_STORAGE_KEY,
      JSON.stringify(parsedBackup.weeklySchedules ?? []),
    )

    window.alert(
      'バックアップを復元しました。Marginを再読み込みします。',
    )

    window.location.reload()
  } catch {
    setRestoreMessage(
      'ファイルを読み込めませんでした。JSON形式のバックアップを選んでください。',
    )
  } finally {
    event.target.value = ''
  }
}
  return (
    <section className="card data-backup">
      <div className="card-heading">
        <div>
          <p className="section-label">
            データの保護
          </p>

          <h2 className="card-title">
            Marginのバックアップ
          </h2>
        </div>
      </div>

      <p className="supporting-text">
        今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定、一日の記録、週間予定、5分の着手回数を
        1つのファイルに保存します。
      </p>

      <p className="supporting-text data-storage-notice">
        Marginのデータは、この端末のブラウザー内に保存されます。別の端末へ自動同期されません。ブラウザーのWebサイトデータを削除すると記録が消える可能性があるため、定期的にバックアップを保存してください。
      </p>

      <button
        className="secondary-button"
        type="button"
        onClick={() => {
          try {
            downloadBackup()
            setRestoreMessage('')
          } catch {
            setRestoreMessage('バックアップを書き出せませんでした。保存データや、ブラウザーの設定を確認してください。保存内容は変更していません。')
          }
        }}
      >
        バックアップを書き出す
      </button>
      <button
  className="secondary-button"
  type="button"
  onClick={() => {
    setRestoreMessage('')
    restoreInputRef.current?.click()
  }}
>
  バックアップから復元する
</button>

<input
  ref={restoreInputRef}
  type="file"
  accept=".json,application/json"
  onChange={restoreBackup}
  hidden
/>

{restoreMessage !== '' && (
  <p className="supporting-text">
    {restoreMessage}
  </p>
)}
    </section>
  )
}

export default DataBackup
