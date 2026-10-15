import {
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { isValidCourseBackup, parseCourse } from './CourseStorage'
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

type BackupData = {
  version: 1
  createdAt: string
  entry: string
  tasks: unknown[]
  courses: unknown[]
  loosePlans?: unknown[]
  timetableSettings?: TimetableSettings
}

function readSavedArray(storageKey: string): unknown[] {
  const savedValue = localStorage.getItem(storageKey)

  if (savedValue === null) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
  } catch {
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
        value.loosePlans.every(isValidLoosePlan)))
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
  }
}

function downloadBackup() {
  const backupData = createBackupData()

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

    const shouldRestore = window.confirm(
      '現在の今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定をバックアップの内容で置き換えますか？',
    )

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
        今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定を
        1つのファイルに保存します。
      </p>

      <p className="supporting-text data-storage-notice">
        Marginのデータは、この端末のブラウザー内に保存されます。別の端末へ自動同期されません。ブラウザーのWebサイトデータを削除すると記録が消える可能性があるため、定期的にバックアップを保存してください。
      </p>

      <button
        className="secondary-button"
        type="button"
        onClick={downloadBackup}
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
