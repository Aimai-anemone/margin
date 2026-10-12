const ENTRY_STORAGE_KEY = 'margin-entry'
const TASKS_STORAGE_KEY = 'margin-tasks'
const COURSES_STORAGE_KEY = 'margin-courses'

type BackupData = {
  version: 1
  createdAt: string
  entry: string
  tasks: unknown[]
  courses: unknown[]
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

function createBackupData(): BackupData {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    entry:
      localStorage.getItem(ENTRY_STORAGE_KEY) ?? '',
    tasks: readSavedArray(TASKS_STORAGE_KEY),
    courses: readSavedArray(COURSES_STORAGE_KEY),
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
        今日の入口、課題、授業テンプレートを
        1つのファイルに保存します。
      </p>

      <button
        className="secondary-button"
        type="button"
        onClick={downloadBackup}
      >
        バックアップを書き出す
      </button>
    </section>
  )
}

export default DataBackup
