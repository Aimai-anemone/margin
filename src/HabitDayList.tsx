import { useState } from 'react'
import { getLocalDate } from './LoosePlanStorage'
import { habitsForDate, habitSteps, habitResultLabel, isRecentHabitDate, type HabitResult } from './HabitStorage'
import { storageFailureMessage } from './StorageSafety'
import { type HabitsController } from './useHabits'

type Props = { controller: HabitsController; initialHabitId?: string | null; onBack: () => void; onManage: () => void }
const formatDate = (date: string) => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`))

export default function HabitDayList({ controller, initialHabitId, onBack, onManage }: Props) {
  const [date, setDate] = useState(() => getLocalDate())
  const [selectedId, setSelectedId] = useState<string | null>(initialHabitId ?? null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const items = habitsForDate(controller.data, date)
  const habit = items.find((item) => item.id === selectedId)
  const record = habit && controller.data.records.find((item) => item.habitId === habit.id && item.date === date)
  const inRange = isRecentHabitDate(date)

  function save(result: HabitResult) {
    if (!habit || controller.error) return
    setMessage('')
    try {
      controller.record(habit.id, date, result)
      setError('')
      setMessage('記録を保存しました。')
    } catch (failure) { setError(storageFailureMessage(failure)) }
  }

  function cancel() {
    if (!habit || !record || controller.error || !window.confirm('この日の記録を未記録に戻しますか？')) return
    setMessage('')
    try {
      controller.cancelRecord(habit.id, date)
      setError('')
      setMessage('記録を取り消しました。')
    } catch (failure) { setError(storageFailureMessage(failure)) }
  }

  return <div className="habits-page">
    <header className="habit-page-heading">
      <button className="cancel-button" type="button" onClick={habit ? () => { setSelectedId(null); setError(''); setMessage('') } : onBack}>
        {habit ? '選択日の習慣へ戻る' : '今日へ戻る'}
      </button>
      <h1 className="card-title">習慣</h1>
      <div className="habit-frequency-options" role="group" aria-label="習慣画面">
        <button className="habit-choice" type="button" aria-pressed={true}>今日の習慣</button>
        <button className="habit-choice" type="button" aria-pressed={false} onClick={onManage}>習慣の管理</button>
      </div>
      <div className="habit-date-picker" role="group" aria-label="記録する日">
        {['今日', '昨日', '一昨日'].map((label, index) => {
          const value = getLocalDate(-index)
          return <button type="button" className="habit-choice" key={label} aria-pressed={date === value} onClick={() => {
            controller.refresh(); setDate(getLocalDate(-index)); setSelectedId(null); setError(''); setMessage('')
          }}>{label}<span>{formatDate(value)}</span></button>
        })}
      </div>
    </header>
    <p className="supporting-text">{formatDate(date)}</p>
    {!inRange && <p className="storage-message" role="alert">日付が変わり、この日の習慣を記録できる期間を過ぎました。</p>}
    {(controller.error || error) && <p className="storage-message" role="alert">{controller.error || error}</p>}
    {message && <p className="supporting-text" role="status">{message}</p>}
    {!controller.error && (habit ? <section className="card habit-record-editor">
      <h2 className="closing-title">{habit.name}</h2>
      {habit.trigger && <p className="supporting-text">{habit.trigger}</p>}
      <p>今日はどこまでできましたか？</p>
      <p className="supporting-text">選ぶとすぐに保存します。あとから選び直せます。</p>
      {habitSteps.map((step) => <button type="button" className="habit-choice habit-step-choice" key={step.value}
        disabled={!inRange} aria-pressed={record?.result === step.value} onClick={() => save(step.value)}>
        <span>{step.label}{record?.result === step.value && '（記録済み）'}</span>
        <span>{habit.steps[step.value]}</span>
      </button>)}
      <button type="button" className="cancel-button habit-rest-choice" disabled={!inRange}
        aria-pressed={record?.result === 'rest'} onClick={() => save('rest')}>今日は休む{record?.result === 'rest' && '（記録済み）'}</button>
      {record && <>
        <p className="supporting-text">記録時：{record.habitName}{record.selectedContent !== null && `・${record.selectedContent}`}</p>
        <button className="cancel-button" type="button" disabled={!inRange} onClick={cancel}>記録を取り消す</button>
      </>}
    </section> : items.length === 0 ? <p className="card supporting-text">この日の対象の習慣はありません。</p>
      : items.map((item) => {
        const saved = controller.data.records.find((entry) => entry.habitId === item.id && entry.date === date)
        return <section className="card habit-day-item" key={item.id}>
          <h2 className="closing-title">{item.name}</h2>
          {item.status !== 'active' && <p className="supporting-text">{item.status === 'paused' ? '休止中' : '非表示'}</p>}
          {item.trigger && <p className="habit-trigger-preview">{item.trigger}</p>}
          <button type="button" className="secondary-button" onClick={() => { setSelectedId(item.id); setMessage(''); setError('') }}>{habitResultLabel(saved?.result)}</button>
        </section>
      }))}
  </div>
}
