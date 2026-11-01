import { useEffect, useState } from 'react'
import TasksPage from './TasksPage'
import WeeklySchedule from './WeeklySchedule'
import LoosePlanPanel from './LoosePlans'
import SettingsPage from './SettingsPage'
import EndOfDay from './EndOfDay'
import RecordsPage from './RecordsPage'
import FiveMinuteStart from './FiveMinuteStart'
import { useFiveMinuteStart } from './useFiveMinuteStart'
import { useHabits } from './useHabits'
import HabitsPage from './HabitsPage'
import TodayHabitsCard from './TodayHabitsCard'
import { loadEntryState, saveEntryValue } from './EntryStorage'
import { requireStoredData, storageFailureMessage } from './StorageSafety'
import { deleteDailyRecord, loadDailyRecords, saveDailyRecord, type DailyRecordInput } from './DailyRecordStorage'
import { loadTimetableSettingsState, saveTimetableSettings, type TimetableSettings } from './TimetableStorage'
import {
  getLocalDate,
  loadLoosePlanState,
  writeLoosePlans,
  type LoosePlan,
} from './LoosePlanStorage'
import './App.css'

type ActiveTab = 'today' | 'tasks' | 'weekly' | 'records' | 'settings'

function App() {
  const [entryState, setEntryState] = useState(loadEntryState)
  const entry = entryState.data
  const [entryError, setEntryError] = useState('')

  const [entryDraft, setEntryDraft] = useState('')
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('today')
  const [endOfDayDate, setEndOfDayDate] = useState<string | null>(null)
  const [isShowingFiveMinute, setIsShowingFiveMinute] = useState(false)
  const [isShowingHabits, setIsShowingHabits] = useState(false)
  const habits = useHabits()
  const fiveMinute = useFiveMinuteStart()
  const [dailyRecordState, setDailyRecordState] = useState(loadDailyRecords)
  const [timetableState, setTimetableState] = useState(loadTimetableSettingsState)
  const timetableSettings = timetableState.data
  const [timetableError, setTimetableError] = useState('')
  useEffect(() => {
    if (timetableState.status !== 'missing') return
    let cancelled = false
    // 初回だけの保存を画面の初期描画後に行い、解除後には状態を更新しない。
    queueMicrotask(() => {
      if (cancelled) return
      try {
        saveTimetableSettings(timetableState.data)
        setTimetableState({ status: 'ready', data: timetableState.data, error: '' })
      } catch (error) {
        setTimetableError(storageFailureMessage(error))
      }
    })
    return () => { cancelled = true }
  }, [timetableState])

  function updateTimetableSettings(settings: TimetableSettings) {
    requireStoredData(timetableState)
    saveTimetableSettings(settings)
    setTimetableState({ status: 'ready', data: settings, error: '' })
    setTimetableError('')
  }
  const [loosePlanState, setLoosePlanState] = useState(loadLoosePlanState)
  const loosePlans = loosePlanState.data

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
    if (entryState.status === 'error') return
    setEntryDraft(entry)
    setIsEditingEntry(true)
  }

  function saveEntry() {
    const cleanedEntry = entryDraft.trim()

    if (cleanedEntry === '') {
      return
    }

    try {
      requireStoredData(entryState)
      saveEntryValue(cleanedEntry)
      setEntryState({ status: 'ready', data: cleanedEntry, error: '' })
      setEntryError('')
      setIsEditingEntry(false)
    } catch (error) {
      setEntryError(storageFailureMessage(error))
    }
  }

  function cancelEditingEntry() {
    setEntryDraft(entry)
    setIsEditingEntry(false)
  }

  function deleteEntry() {
  try {
    requireStoredData(entryState)
    saveEntryValue(null)
    setEntryState({ status: 'missing', data: '', error: '' })
    setEntryDraft('')
    setEntryError('')
    setIsEditingEntry(false)
  } catch (error) {
    setEntryError(storageFailureMessage(error))
  }
}

  function saveLoosePlans(nextPlans: LoosePlan[]) {
    requireStoredData(loosePlanState)
    writeLoosePlans(nextPlans)
    setLoosePlanState({ status: 'ready', data: nextPlans, error: '' })
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
    setIsShowingHabits(false)
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
        {timetableError && <p className="weekly-editor-error" role="alert">{timetableError}</p>}
        {activeTab === 'today' && (
          <div
            id="today-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="today-tab"
          >
          {isShowingHabits ? (
            <HabitsPage controller={habits} onBack={() => { setIsShowingHabits(false); window.scrollTo({ top: 0 }) }} />
          ) : isShowingFiveMinute ? (
            <FiveMinuteStart controller={fiveMinute} onBack={closeFiveMinute} />
          ) : endOfDayDate !== null ? (
            <EndOfDay
              date={endOfDayDate}
              record={dailyRecordState.records.find((record) => record.date === endOfDayDate)}
              loadError={dailyRecordState.error}
              loosePlans={loosePlans}
              loosePlansLoadError={loosePlanState.error}
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
          {(entryState.error || entryError) && <p className="storage-message" role="alert">{entryState.error || entryError}</p>}

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
                {entryState.status === 'error' ? '入口を確認できません' : entry || 'まだ決まっていません'}
              </h1>

              <p className="supporting-text">
                {entryState.status === 'error' ? '保存済みの入口は変更せずに残しています。' : entry
                  ? 'この行動から始めれば十分です。'
                  : '次に迷わないよう、最初の一歩だけを決めます。'}
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={startEditingEntry}
                disabled={entryState.status === 'error'}
              >
                {entry ? '入口を変更する' : '入口を決める'}
              </button>
            </>
          )}
          </section>

          <LoosePlanPanel
            plans={loosePlans}
            loadError={loosePlanState.error}
            date={todayDate}
            heading="今日のゆるい予定"
            compact
            onSave={saveLoosePlan}
            onDelete={deleteLoosePlan}
            onToggleComplete={toggleLoosePlanComplete}
          />

          <TodayHabitsCard habits={habits.data.habits} error={habits.error} onOpen={() => {
            setIsShowingHabits(true)
            window.scrollTo({ top: 0 })
          }} />

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
            <TasksPage settings={timetableSettings} settingsLoadError={timetableState.error} onSettingsChange={updateTimetableSettings} />
          </div>
        )}

        {activeTab === 'weekly' && (
          <div
            id="weekly-panel"
            className="tab-panel"
            role="region"
            aria-labelledby="weekly-tab"
          >
            {timetableState.error && <p className="weekly-editor-error" role="alert">{timetableState.error} 開始時刻は一時的な既定値で表示しています。</p>}
            <WeeklySchedule
              startHour={timetableSettings.weeklyStartHour ?? 0}
              loosePlans={loosePlans}
              loosePlansLoadError={loosePlanState.error}
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
              loosePlansLoadError={loosePlanState.error}
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
            <SettingsPage timetableSettings={timetableSettings} loadError={timetableState.error} onSaveTimetableSettings={updateTimetableSettings} />
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
