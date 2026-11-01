import { isHabitDue, habitResultLabel, type Habit, type HabitRecord } from './HabitStorage'
import { getLocalDate } from './LoosePlanStorage'

type Props = { habits: Habit[]; records?: HabitRecord[]; today?: string; error: string; onOpen: (habitId?: string) => void }

export default function TodayHabitsCard({ habits, records = [], today = getLocalDate(), error, onOpen }: Props) {
  const active = habits.filter((habit) => isHabitDue(habit, today))
  const recorded = new Map(records.filter((record) => record.date === today).map((record) => [record.habitId, record]))
  return (
    <section className="card habit-entry">
      <div className="habit-entry-heading">
        <h2 className="closing-title">今日の習慣</h2>
        {!error && active.length > 0 && <span className="habit-entry-count">記録 {active.filter((habit) => recorded.has(habit.id)).length} / {active.length}</span>}
      </div>
      {error ? <p className="storage-message" role="alert">{error}</p> : habits.length === 0 ? (
        <p className="supporting-text">続けたいことを、小さな行動から始めます。</p>
      ) : (
        <>
          {active.length === 0 && <p className="supporting-text">今日は対象の習慣はありません。</p>}
          {active.length > 0 && <ul className="habit-entry-names">
            {active.slice(0, 5).map((habit) => <li key={habit.id}><button type="button" className="habit-entry-row" onClick={() => onOpen(habit.id)}>
              <span>{habit.name}</span><span>{habitResultLabel(recorded.get(habit.id)?.result)}</span>
            </button></li>)}
          </ul>}
          {active.length > 5 && <p className="supporting-text">ほか{active.length - 5}件</p>}
        </>
      )}
      <button type="button" className="secondary-button" onClick={() => onOpen()}>
        {!error && habits.length === 0 ? '習慣を作る' : '習慣を見る'}
      </button>
    </section>
  )
}
