import { useEffect, useState } from 'react'
import TasksPage from './TasksPage'
import WeeklySchedule from './WeeklySchedule'
import LoosePlanPanel from './LoosePlans'
import SettingsPage from './SettingsPage'
import { TIMETABLE_SETTINGS_KEY, loadTimetableSettings, saveTimetableSettings, type TimetableSettings } from './TimetableStorage'
import {
  getLocalDate,
  loadLoosePlans,
  LOOSE_PLANS_STORAGE_KEY,
  type LoosePlan,
} from './LoosePlanStorage'
import './App.css'

const ENTRY_STORAGE_KEY = 'margin-entry'

type ActiveTab = 'today' | 'tasks' | 'weekly' | 'settings'

function App() {
  const [entry, setEntry] = useState(() => {
  return localStorage.getItem(ENTRY_STORAGE_KEY) ?? ''
})

  const [entryDraft, setEntryDraft] = useState('')
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('today')
  const [timetableSettings, setTimetableSettings] = useState(loadTimetableSettings)
  useEffect(() => {
    if (localStorage.getItem(TIMETABLE_SETTINGS_KEY) === null) {
      saveTimetableSettings(timetableSettings)
    }
  }, [timetableSettings])

  function updateTimetableSettings(settings: TimetableSettings) {
    saveTimetableSettings(settings)
    setTimetableSettings(settings)
  }
  const [loosePlans, setLoosePlans] = useState<LoosePlan[]>(
    loadLoosePlans,
  )

  const todayDate = getLocalDate()
  const tomorrowDate = getLocalDate(1)

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

  function saveLoosePlans(nextPlans: LoosePlan[]) {
    setLoosePlans(nextPlans)
    localStorage.setItem(
      LOOSE_PLANS_STORAGE_KEY,
      JSON.stringify(nextPlans),
    )
  }

  function saveLoosePlan(nextPlan: LoosePlan) {
    const hasExistingPlan = loosePlans.some(
      (plan) => plan.id === nextPlan.id,
    )

    saveLoosePlans(
      hasExistingPlan
        ? loosePlans.map((plan) =>
            plan.id === nextPlan.id ? nextPlan : plan,
          )
        : [...loosePlans, nextPlan],
    )
  }

  function deleteLoosePlan(planId: string) {
    saveLoosePlans(
      loosePlans.filter((plan) => plan.id !== planId),
    )
  }

  function toggleLoosePlanComplete(planId: string) {
    saveLoosePlans(
      loosePlans.map((plan) =>
        plan.id === planId
          ? { ...plan, completed: !plan.completed }
          : plan,
      ),
    )
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

          <LoosePlanPanel
            plans={loosePlans}
            date={todayDate}
            heading="今日のゆるい予定"
            compact
            onSave={saveLoosePlan}
            onDelete={deleteLoosePlan}
            onToggleComplete={toggleLoosePlanComplete}
          />

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

          <section className="card closing-section loose-plan-closing-section">
          <div className="closing-section-header">
            <div>
            <p className="section-label">一日の終わり</p>

            <h2 className="closing-title">
              今日はまだ記録していません
            </h2>
            </div>

            <button className="text-button" type="button">
              夜の観察を始める
            </button>
          </div>

          <LoosePlanPanel
            plans={loosePlans}
            date={tomorrowDate}
            heading="明日のゆるい予定"
            compact
            onSave={saveLoosePlan}
            onDelete={deleteLoosePlan}
            onToggleComplete={toggleLoosePlanComplete}
          />
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
            <TasksPage settings={timetableSettings} onSettingsChange={updateTimetableSettings} />
          </div>
        )}

        {activeTab === 'weekly' && (
          <div
            id="weekly-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="weekly-tab"
          >
            <WeeklySchedule
              loosePlans={loosePlans}
              todayDate={todayDate}
              tomorrowDate={tomorrowDate}
              onSaveLoosePlan={saveLoosePlan}
              onDeleteLoosePlan={deleteLoosePlan}
              onToggleLoosePlanComplete={toggleLoosePlanComplete}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div
            id="settings-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="settings-tab"
          >
            <SettingsPage timetableSettings={timetableSettings} onSaveTimetableSettings={updateTimetableSettings} />
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

        <button
          id="settings-tab"
          className={`nav-item ${
            activeTab === 'settings' ? 'active' : ''
          }`}
          type="button"
          aria-pressed={activeTab === 'settings'}
          aria-controls="settings-panel"
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-symbol">○</span>
          <span>設定</span>
        </button>
      </nav>
    </div>
  )
}

export default App
