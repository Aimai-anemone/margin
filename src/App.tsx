import { useState } from 'react'
import TaskList from './TaskList'
import CourseTemplates from './CourseTemplates'
import DataBackup from './DataBackup'
import WeeklySchedule from './WeeklySchedule'
import './App.css'

const ENTRY_STORAGE_KEY = 'margin-entry'

type ActiveTab = 'today' | 'tasks' | 'weekly'

function App() {
  const [entry, setEntry] = useState(() => {
  return localStorage.getItem(ENTRY_STORAGE_KEY) ?? ''
})

  const [entryDraft, setEntryDraft] = useState('')
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('today')

  const today = new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  function startEditingEntry() {
    setEntryDraft(entry)
    setIsEditingEntry(true)
  }

  function saveEntry() {
    const cleanedEntry = entryDraft.trim()

    if (cleanedEntry === '') {
      return
    }

    setEntry(cleanedEntry)
    localStorage.setItem(ENTRY_STORAGE_KEY, cleanedEntry)
    setIsEditingEntry(false)
  }

  function cancelEditingEntry() {
    setEntryDraft(entry)
    setIsEditingEntry(false)
  }

  function deleteEntry() {
  setEntry('')
  setEntryDraft('')
  localStorage.removeItem(ENTRY_STORAGE_KEY)
  setIsEditingEntry(false)
}

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-name">Margin</p>
          <p className="today-date">{today}</p>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'today' && (
          <div
            id="today-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="today-tab"
          >
          <section className="card primary-card">
          <p className="section-label">今日の入口</p>

          {isEditingEntry ? (
            <div className="entry-editor">
              <label className="input-label" htmlFor="entry-input">
                最初に何をしますか？
              </label>

              <input
                id="entry-input"
                className="entry-input"
                type="text"
                value={entryDraft}
                onChange={(event) => setEntryDraft(event.target.value)}
                placeholder="例：英語課題のPDFを開く"
                autoFocus
              />

              <div className="editor-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={saveEntry}
                  disabled={entryDraft.trim() === ''}
                >
                  保存する
                </button>

                <button
                  className="cancel-button"
                  type="button"
                  onClick={cancelEditingEntry}
                >
                  やめる
                </button>
              </div>

              {entry && (
  <button
    className="delete-button"
    type="button"
    onClick={deleteEntry}
  >
    入口を削除する
  </button>
)}
            </div>
          ) : (
            <>
              <h1 className="card-title">
                {entry || 'まだ決まっていません'}
              </h1>

              <p className="supporting-text">
                {entry
                  ? 'この行動から始めれば十分です。'
                  : '次に迷わないよう、最初の一歩だけを決めます。'}
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={startEditingEntry}
              >
                {entry ? '入口を変更する' : '入口を決める'}
              </button>
            </>
          )}
          </section>

          <section className="card">
          <div className="card-heading">
            <div>
              <p className="section-label">帰宅後</p>

              <h2 className="card-title">
                5分の着手レーン
              </h2>
            </div>

            <span className="badge">5分</span>
          </div>

          <p className="supporting-text">
            SNSや動画を開く前に、最初の行動へ移ります。
          </p>

          <button className="secondary-button" type="button">
            着手レーンを準備する
          </button>
          </section>

          <section className="closing-section">
          <div>
            <p className="section-label">一日の終わり</p>

            <h2 className="closing-title">
              今日はまだ記録していません
            </h2>
          </div>

          <button className="text-button" type="button">
            夜の観察を始める
          </button>
          </section>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div
            id="tasks-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="tasks-tab"
          >
            <TaskList />

            <CourseTemplates />

            <DataBackup />
          </div>
        )}

        {activeTab === 'weekly' && (
          <div
            id="weekly-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="weekly-tab"
          >
            <WeeklySchedule />
          </div>
        )}
      </main>

      <nav
        className="bottom-navigation"
        aria-label="画面の切り替え"
      >
        <button
          id="today-tab"
          className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'today'}
          aria-controls="today-panel"
          onClick={() => setActiveTab('today')}
        >
          <span className="nav-symbol">●</span>
          <span>今日</span>
        </button>

        <button
          id="tasks-tab"
          className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'tasks'}
          aria-controls="tasks-panel"
          onClick={() => setActiveTab('tasks')}
        >
          <span className="nav-symbol">□</span>
          <span>課題</span>
        </button>

        <button
          id="weekly-tab"
          className={`nav-item ${activeTab === 'weekly' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'weekly'}
          aria-controls="weekly-panel"
          onClick={() => setActiveTab('weekly')}
        >
          <span className="nav-symbol">△</span>
          <span>週間</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">◇</span>
          <span>記録</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">○</span>
          <span>設定</span>
        </button>
      </nav>
    </div>
  )
}

export default App
