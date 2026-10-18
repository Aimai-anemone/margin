import { useEffect, useState } from 'react'
import TasksPage from './TasksPage'
import WeeklySchedule from './WeeklySchedule'
import LoosePlanPanel from './LoosePlans'
import SettingsPage from './SettingsPage'
import EndOfDay from './EndOfDay'
import RecordsPage from './RecordsPage'
import FiveMinuteStart from './FiveMinuteStart'
import { useFiveMinuteStart } from './useFiveMinuteStart'
import { deleteDailyRecord, loadDailyRecords, saveDailyRecord, type DailyRecordInput } from './DailyRecordStorage'
import { TIMETABLE_SETTINGS_KEY, loadTimetableSettings, saveTimetableSettings, type TimetableSettings } from './TimetableStorage'
import {
  getLocalDate,
  loadLoosePlans,
  LOOSE_PLANS_STORAGE_KEY,
  type LoosePlan,
} from './LoosePlanStorage'
import './App.css'

const ENTRY_STORAGE_KEY = 'margin-entry'

type ActiveTab = 'today' | 'tasks' | 'weekly' | 'records' | 'settings'

function App() {
  const [entry, setEntry] = useState(() => {
  return localStorage.getItem(ENTRY_STORAGE_KEY) ?? ''
})

  const [entryDraft, setEntryDraft] = useState('')
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('today')
  const [endOfDayDate, setEndOfDayDate] = useState<string | null>(null)
  const [isShowingFiveMinute, setIsShowingFiveMinute] = useState(false)
  const fiveMinute = useFiveMinuteStart()
  const [dailyRecordState, setDailyRecordState] = useState(loadDailyRecords)
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
  const todaysRecord = dailyRecordState.records.find((record) => record.date === todayDate)
  const fiveMinuteCount = fiveMinute.state.counts.find((item) => item.date === fiveMinute.today)?.count ?? 0

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

  function selectTab(tab: ActiveTab) {
    setEndOfDayDate(null)
    setIsShowingFiveMinute(false)
    if (tab === 'records') reloadRecords()
    setActiveTab(tab)
  }

  function reloadRecords() {
    const latest = loadDailyRecords()
    setDailyRecordState(latest)
    return latest
  }

  function saveRecord(record: DailyRecordInput, operation: 'create' | 'update') {
    const records = saveDailyRecord(record, operation)
    setDailyRecordState({ records, error: '' })
  }

  function deleteRecord(date: string) {
    const records = deleteDailyRecord(date)
    setDailyRecordState({ records, error: '' })
  }

  function openEndOfDay() {
    setDailyRecordState(loadDailyRecords())
    setEndOfDayDate(getLocalDate())
    window.scrollTo({ top: 0 })
  }

  function closeEndOfDay() {
    setEndOfDayDate(null)
    window.scrollTo({ top: 0 })
  }

  function openFiveMinute() {
    setEndOfDayDate(null)
    setIsShowingFiveMinute(true)
    void fiveMinute.refresh()
    window.scrollTo({ top: 0 })
  }

  function closeFiveMinute() {
    setIsShowingFiveMinute(false)
    window.scrollTo({ top: 0 })
  }

  function saveTodaysRecord(record: DailyRecordInput) {
    if (record.date !== getLocalDate()) {
      throw new Error('日付が変わりました。一日の終わりを開き直してください。')
    }
    const records = saveDailyRecord(record)
    setDailyRecordState({ records, error: '' })
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
          {isShowingFiveMinute ? (
            <FiveMinuteStart controller={fiveMinute} onBack={closeFiveMinute} />
          ) : endOfDayDate !== null ? (
            <EndOfDay
              date={endOfDayDate}
              record={dailyRecordState.records.find((record) => record.date === endOfDayDate)}
              loadError={dailyRecordState.error}
              loosePlans={loosePlans}
              onBack={closeEndOfDay}
              onSave={saveTodaysRecord}
              onSaveLoosePlan={saveLoosePlan}
              onDeleteLoosePlan={deleteLoosePlan}
              onToggleLoosePlanComplete={toggleLoosePlanComplete}
            />
          ) : (
          <>
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
            手をつけにくいことを、5分だけ始めます。
          </p>

          {fiveMinuteCount > 0 && <p className="supporting-text">今日、{fiveMinuteCount}回取り組みました</p>}
          {fiveMinute.error && <p className="five-minute-entry-message" role="alert">{fiveMinute.error}</p>}
          {fiveMinute.notice && <p className="five-minute-entry-message" role="status">{fiveMinute.notice}</p>}
          <button className="secondary-button" type="button" onClick={openFiveMinute}>
            {fiveMinute.state.activeTimer
              ? fiveMinute.state.activeTimer.counted ? '5分の結果を見る' : '5分へ戻る'
              : '5分だけ始める'}
          </button>
          </section>

          <section className="card end-of-day-entry">
            <h2 className="closing-title">一日の終わり</h2>
            <p className="supporting-text">
              {todaysRecord
                ? '今日の記録は保存済みです。必要なときに見直せます。'
                : '今日を静かに振り返り、明日の準備をします。'}
            </p>
            {dailyRecordState.error && <p className="end-of-day-error" role="alert">{dailyRecordState.error}</p>}
            <button className="secondary-button" type="button" onClick={openEndOfDay}>
              {todaysRecord ? '今日の記録を見直す' : '今日を振り返る'}
            </button>
          </section>
          </>
          )}
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
              startHour={timetableSettings.weeklyStartHour ?? 0}
              loosePlans={loosePlans}
              todayDate={todayDate}
              tomorrowDate={tomorrowDate}
              onSaveLoosePlan={saveLoosePlan}
              onDeleteLoosePlan={deleteLoosePlan}
              onToggleLoosePlanComplete={toggleLoosePlanComplete}
            />
          </div>
        )}

        {activeTab === 'records' && (
          <div
            id="records-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="records-tab"
          >
            <RecordsPage
              records={dailyRecordState.records}
              loadError={dailyRecordState.error}
              loosePlans={loosePlans}
              onReloadRecords={reloadRecords}
              onSaveRecord={saveRecord}
              onDeleteRecord={deleteRecord}
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
          onClick={() => selectTab('today')}
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
          onClick={() => selectTab('tasks')}
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
          onClick={() => selectTab('weekly')}
        >
          <span className="nav-symbol">△</span>
          <span>週間</span>
        </button>

        <button
          id="records-tab"
          className={`nav-item ${activeTab === 'records' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeTab === 'records'}
          aria-controls="records-panel"
          onClick={() => selectTab('records')}
        >
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
          onClick={() => selectTab('settings')}
        >
          <span className="nav-symbol">○</span>
          <span>設定</span>
        </button>
      </nav>
    </div>
  )
}

export default App
