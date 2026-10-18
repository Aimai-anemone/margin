import { useState } from 'react'
import EndOfDay from './EndOfDay'
import RecordSummary from './RecordSummary'
import { formatRecordMinutes as formatMinutes, type RecordPeriod } from './DailyRecordSummary'
import { dayPeriods, getLocalDate, type LoosePlan } from './LoosePlanStorage'
import {
  DailyRecordExistsError,
  canCreateDailyRecord,
  type DailyRecord,
  type DailyRecordInput,
} from './DailyRecordStorage'

type Props = {
  records: DailyRecord[]
  loadError: string
  loosePlans: LoosePlan[]
  onReloadRecords: () => { records: DailyRecord[]; error: string }
  onSaveRecord: (record: DailyRecordInput, operation: 'create' | 'update') => void
  onDeleteRecord: (date: string) => void
  onSaveLoosePlan: (plan: LoosePlan) => void
  onDeleteLoosePlan: (planId: string) => void
  onToggleLoosePlanComplete: (planId: string) => void
}

type RecordsView =
  | { kind: 'list' }
  | { kind: 'detail'; date: string }
  | { kind: 'edit'; date: string }
  | { kind: 'create'; date: string; isToday: boolean }

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function planSummary(record: DailyRecord) {
  return record.loosePlans.length === 0 ? 'ゆるい予定 0件' :
    `ゆるい予定 ${record.loosePlans.filter((plan) => plan.completed).length} / ${record.loosePlans.length}`
}

function RecordsPage({
  records, loadError, loosePlans, onReloadRecords, onSaveRecord, onDeleteRecord,
  onSaveLoosePlan, onDeleteLoosePlan, onToggleLoosePlanComplete,
}: Props) {
  const [view, setView] = useState<RecordsView>({ kind: 'list' })
  const [summaryPeriod, setSummaryPeriod] = useState<RecordPeriod>('week')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const selectedRecord = view.kind === 'detail' || view.kind === 'edit'
    ? records.find((record) => record.date === view.date) : undefined
  const recentDates = [0, -1, -2].map((offset) => getLocalDate(offset))
    .filter((date) => !records.some((record) => record.date === date))
  const sortedRecords = [...records].sort((first, second) => second.date.localeCompare(first.date))

  function showList() {
    onReloadRecords()
    setView({ kind: 'list' })
    setMessage('')
    setActionError('')
    window.scrollTo({ top: 0 })
  }

  function showDetail(date: string) {
    setView({ kind: 'detail', date })
    setMessage('')
    setActionError('')
    window.scrollTo({ top: 0 })
  }

  function startCreating(date: string) {
    const latest = onReloadRecords()
    setActionError('')
    if (latest.error) return
    if (latest.records.some((record) => record.date === date)) {
      showDetail(date)
      setMessage('この日の記録は、すでに保存されています。')
      return
    }
    if (!canCreateDailyRecord(date)) {
      setMessage('新しく記録できるのは、今日・昨日・2日前です。')
      return
    }
    setView({ kind: 'create', date, isToday: date === getLocalDate() })
    setMessage('')
    window.scrollTo({ top: 0 })
  }

  function saveRecord(input: DailyRecordInput) {
    if (view.kind !== 'create' && view.kind !== 'edit') return
    try {
      onSaveRecord(input, view.kind === 'create' ? 'create' : 'update')
    } catch (error) {
      if (error instanceof DailyRecordExistsError) {
        onReloadRecords()
        showDetail(input.date)
        setMessage(error.message)
        return
      }
      throw error
    }
    if (view.kind === 'create') {
      setView({ kind: 'list' })
      setMessage('記録を保存しました。')
    } else {
      setView({ kind: 'detail', date: input.date })
      setMessage('記録を更新しました。')
    }
    window.scrollTo({ top: 0 })
  }

  function deleteRecord(record: DailyRecord) {
    if (!window.confirm(`${formatDate(record.date)}の記録を削除しますか？\n削除した記録は元に戻せません。元のゆるい予定は残ります。`)) return
    try {
      onDeleteRecord(record.date)
      setView({ kind: 'list' })
      setMessage('記録を削除しました。')
      setActionError('')
      window.scrollTo({ top: 0 })
    } catch {
      setActionError('記録を削除できませんでした。保存内容やブラウザーの保存設定を確認してください。')
    }
  }

  if (view.kind === 'create' || (view.kind === 'edit' && selectedRecord)) {
    return (
      <EndOfDay
        key={`${view.kind}-${view.date}`}
        date={view.date}
        mode={view.kind === 'edit' ? 'edit' : view.isToday ? 'today' : 'create'}
        backLabel={view.kind === 'edit' ? '詳細へ戻る' : '記録へ戻る'}
        record={selectedRecord}
        loadError={loadError}
        loosePlans={loosePlans}
        onBack={view.kind === 'edit' ? () => showDetail(view.date) : showList}
        onSave={saveRecord}
        onSaveLoosePlan={onSaveLoosePlan}
        onDeleteLoosePlan={onDeleteLoosePlan}
        onToggleLoosePlanComplete={onToggleLoosePlanComplete}
      />
    )
  }

  return (
    <div className="records-page">
      <header className="records-heading">
        {view.kind !== 'list' && <button className="cancel-button" type="button" onClick={showList}>記録へ戻る</button>}
        <h1 className="card-title">{view.kind === 'list' ? '記録' : '記録の詳細'}</h1>
        {view.kind === 'list' ? (
          <p className="supporting-text">一日の振り返りを見返し、自分の傾向を少しずつ確かめます。</p>
        ) : <p className="record-date">{formatDate(view.date)}</p>}
      </header>

      {message && <p className="supporting-text" role="status">{message}</p>}
      {loadError && <p className="card end-of-day-error" role="alert">{loadError}</p>}
      {actionError && <p className="end-of-day-error" role="alert">{actionError}</p>}

      {view.kind === 'list' ? (
        <>
          {!loadError && <RecordSummary records={records} period={summaryPeriod} onPeriodChange={setSummaryPeriod} />}
          {!loadError && recentDates.length > 0 && (
            <section className="card records-section">
              <h2 className="closing-title">最近の未記録</h2>
              <p className="supporting-text">今日を含む3日分まで、あとから記録できます。</p>
              <div className="record-missing-days">
                {recentDates.map((date) => (
                  <button className="secondary-button" type="button" key={date} onClick={() => startCreating(date)}>
                    {date === getLocalDate() ? '今日・' : date === getLocalDate(-1) ? '昨日・' : '一昨日・'}{formatDate(date)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="record-list" aria-labelledby="record-list-heading">
            <h2 className="closing-title" id="record-list-heading">過去の記録</h2>
            {!loadError && sortedRecords.length === 0 && (
              <p className="card supporting-text">まだ記録はありません。一日の終わりを振り返ると、ここに残ります。</p>
            )}
            {sortedRecords.map((record) => (
              <button className="card record-list-item" type="button" key={record.date}
                aria-label={`${formatDate(record.date)}の記録を見る`} onClick={() => showDetail(record.date)}>
                <span className="record-list-date">{formatDate(record.date)}</span>
                <span className="record-plan-summary">{planSummary(record)}</span>
                <span className="record-time-row"><span>スクリーンタイム</span><span>{formatMinutes(record.screenTimeMinutes)}</span></span>
                <span className="record-time-row"><span>意図せず使った時間</span><span>{formatMinutes(record.unintendedMinutes)}</span></span>
                {record.insight && <span className="record-list-preview">{record.insight}</span>}
              </button>
            ))}
          </section>
        </>
      ) : selectedRecord ? (
        <>
          <section className="card records-section">
            <h2 className="closing-title">保存されたゆるい予定</h2>
            <p className="supporting-text">{selectedRecord.loosePlans.length === 0
              ? 'この日に保存されたゆるい予定はありません。' : planSummary(selectedRecord)}</p>
            {dayPeriods.map((period) => selectedRecord.loosePlans
              .filter((plan) => plan.dayPeriod === period.value)
              .map((plan, index) => (
                <div className="record-saved-plan" key={`${plan.id}-${period.value}-${index}`}>
                  <span className="record-saved-period">{period.label}</span>
                  <div>
                    <p className={`record-saved-title${plan.completed ? ' completed' : ''}`}>{plan.title}</p>
                    <p className="record-saved-status">{plan.completed ? '✓ 完了' : '○ 未完了'}</p>
                    {plan.memo && <p className="record-saved-memo">{plan.memo}</p>}
                  </div>
                </div>
              )))}
          </section>

          <section className="card records-section">
            <dl className="record-time-values">
              <dt>スクリーンタイム</dt><dd>{formatMinutes(selectedRecord.screenTimeMinutes)}</dd>
              <dt>意図せず使った時間</dt><dd>{formatMinutes(selectedRecord.unintendedMinutes)}</dd>
            </dl>
            <h2 className="closing-title">この日の気づき</h2>
            <p className="record-insight">{selectedRecord.insight || '気づきの記録なし'}</p>
          </section>

          <div className="record-detail-actions">
            <button className="secondary-button" type="button" onClick={() => {
              setView({ kind: 'edit', date: selectedRecord.date })
              setMessage('')
              setActionError('')
              window.scrollTo({ top: 0 })
            }}>編集する</button>
            <button className="record-delete-button" type="button" onClick={() => deleteRecord(selectedRecord)}>削除する</button>
          </div>
        </>
      ) : <p className="card supporting-text">記録が見つかりません。記録一覧へ戻って確認してください。</p>}
    </div>
  )
}

export default RecordsPage
