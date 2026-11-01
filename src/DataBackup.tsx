import {
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { MAX_BACKUP_FILE_SIZE, isValidBackupData, prepareBackupForRestore, type BackupData } from './BackupValidation'
import { backupRestoreMessage, restoreBackupValues } from './BackupRestore'
import {
  HABITS_STORAGE_KEY, HABIT_RECORDS_STORAGE_KEY, readHabitData,
  loadHabitState, loadHabitRecordState, habitRecoveryRequired, clearHabitRecoveryAfterRestore,
  markHabitRecoveryRequired,
} from './HabitStorage'
import { loadCourseState, parseCourse } from './CourseStorage'
import { loadEntryState } from './EntryStorage'
import { loadTaskState } from './TaskStorage'
import { loadLoosePlanState } from './LoosePlanStorage'
import { loadWeeklyScheduleState } from './WeeklyScheduleStorage'
import { requireStoredData, storageFailureMessage, StorageSafetyError } from './StorageSafety'
import {
  FIVE_MINUTE_STORAGE_KEY, hasFiveMinuteCounts, readFiveMinuteCounts,
} from './FiveMinuteStorage'
import {
  DAILY_RECORDS_STORAGE_KEY,
  readDailyRecords,
} from './DailyRecordStorage'
import {
  TIMETABLE_SETTINGS_KEY,
  createDefaultTimetableSettings,
  loadTimetableSettingsState,
} from './TimetableStorage'
const ENTRY_STORAGE_KEY = 'margin-entry'
const TASKS_STORAGE_KEY = 'margin-tasks'
const COURSES_STORAGE_KEY = 'margin-courses'
const LOOSE_PLANS_STORAGE_KEY = 'margin-loose-plans'
const WEEKLY_SCHEDULES_STORAGE_KEY = 'margin-weekly-schedules'

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

function readForBackup<T>(label: string, read: () => T): T {
  try {
    return read()
  } catch {
    // 検証済みの読み込み処理を再利用し、内容や技術的な例外文は表示しない。
    throw new StorageSafetyError('unreadable', `${label}の保存データを読み込めないため、書き出しを中止しました。保存内容は変更していません。バックアップやブラウザーの保存設定を確認してください。`)
  }
}

function createBackupData(): BackupData {
  const habitData = readHabitData()
  const timetableSettings = requireStoredData(loadTimetableSettingsState())
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    entry: requireStoredData(loadEntryState()),
    tasks: requireStoredData(loadTaskState()),
    courses: requireStoredData(loadCourseState()),
    loosePlans: requireStoredData(loadLoosePlanState()),
    timetableSettings,
    dailyRecords: readForBackup('一日の記録', readDailyRecords),
    weeklySchedules: requireStoredData(loadWeeklyScheduleState()),
    fiveMinuteStarts: readForBackup('5分の着手', readFiveMinuteCounts),
    habits: habitData.habits,
    habitRecords: habitData.records,
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

  let didRestore = false
  try {
    if (selectedFile.size > MAX_BACKUP_FILE_SIZE) {
      setRestoreMessage('バックアップファイルが大きすぎます。5MB以下のファイルを選んでください。復元は行っていません。')
      return
    }
    let backupText: string
    try {
      backupText = await selectedFile.text()
    } catch {
      setRestoreMessage('ファイルを読み込めませんでした。ファイルを選び直してください。復元は行っていません。')
      return
    }
    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(backupText)
    } catch {
      setRestoreMessage('JSON形式を確認できませんでした。Marginから書き出したバックアップを選んでください。復元は行っていません。')
      return
    }

    const prepared = prepareBackupForRestore(parsedValue)
    if (prepared.error !== undefined) {
      setRestoreMessage(prepared.error)
      return
    }
    const parsedBackup = prepared.data

    const warnings: string[] = []
    if (parsedBackup.habits === undefined) {
      const habits = loadHabitState()
      const records = loadHabitRecordState()
      if (habitRecoveryRequired() || habits.status === 'error' || records.status === 'error' || habits.data.length > 0 || records.data.length > 0) {
        warnings.push('このバックアップには習慣のデータが含まれていません。復元すると、現在の習慣と実績は削除されます。')
      }
    }
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
      '現在の今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定、一日の記録、週間予定、5分の着手回数、習慣と実績をバックアップの内容で置き換えますか？\n進行中の5分タイマーは終了します。',
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

    // 新しい文字列は先にすべて用意し、確認後の退避・書き込みだけを一括処理する。
    const result = restoreBackupValues([
      { key: ENTRY_STORAGE_KEY, value: parsedBackup.entry === '' ? null : parsedBackup.entry },
      { key: TASKS_STORAGE_KEY, value: JSON.stringify(parsedBackup.tasks) },
      { key: COURSES_STORAGE_KEY, value: JSON.stringify(restoredCourses) },
      { key: TIMETABLE_SETTINGS_KEY, value: JSON.stringify(restoredSettings) },
      { key: LOOSE_PLANS_STORAGE_KEY, value: JSON.stringify(parsedBackup.loosePlans ?? []) },
      { key: DAILY_RECORDS_STORAGE_KEY, value: JSON.stringify(parsedBackup.dailyRecords ?? []) },
      { key: FIVE_MINUTE_STORAGE_KEY, value: JSON.stringify({ counts: parsedBackup.fiveMinuteStarts ?? [], activeTimer: null }) },
      { key: WEEKLY_SCHEDULES_STORAGE_KEY, value: JSON.stringify(parsedBackup.weeklySchedules ?? []) },
      { key: HABITS_STORAGE_KEY, value: JSON.stringify(parsedBackup.habits ?? []) },
      { key: HABIT_RECORDS_STORAGE_KEY, value: JSON.stringify(parsedBackup.habitRecords ?? []) },
    ])
    if (result.status !== 'success') {
      if (result.status === 'rollback-failed') markHabitRecoveryRequired()
      setRestoreMessage(backupRestoreMessage(result))
      return
    }
    didRestore = true
    clearHabitRecoveryAfterRestore()

    window.alert(
      'バックアップを復元しました。Marginを再読み込みします。',
    )

    window.location.reload()
  } catch {
    setRestoreMessage(
      didRestore
        ? 'バックアップの保存は完了しましたが、再読み込みできませんでした。画面を手動で再読み込みしてください。'
        : '復元の準備または保存データの確認ができなかったため、復元を中止しました。保存内容は変更していません。ブラウザーの保存設定を確認してください。',
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
        今日の入口、課題、授業テンプレート、ゆるい予定、時間割設定、一日の記録、週間予定、5分の着手回数、習慣と実績を
        1つのファイルに保存します。
      </p>

      <p className="supporting-text data-storage-notice">
        Marginのデータは、この端末のブラウザー内に保存されます。別の端末へ自動同期されません。ブラウザーのWebサイトデータを削除すると記録が消える可能性があるため、定期的にバックアップを保存してください。
      </p>
      <p className="supporting-text">復元前に、現在のデータをバックアップしておくことをおすすめします。</p>

      <button
        className="secondary-button"
        type="button"
        onClick={() => {
          try {
            downloadBackup()
            setRestoreMessage('')
          } catch (error) {
            setRestoreMessage(`バックアップの書き出しを中止しました。${storageFailureMessage(error, '保存データや、ブラウザーの設定を確認してください。保存内容は変更していません。')}`)
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
  <p className="supporting-text" role="status">
    {restoreMessage}
  </p>
)}
    </section>
  )
}

export default DataBackup
