import { type Habit } from './HabitStorage'

type Props = { habits: Habit[]; error: string; onOpen: () => void }

export default function TodayHabitsCard({ habits, error, onOpen }: Props) {
  const active = habits.filter((habit) => habit.status === 'active')
  const paused = habits.filter((habit) => habit.status === 'paused')
  return (
    <section className="card habit-entry">
      <h2 className="closing-title">今日の習慣</h2>
      {error ? <p className="storage-message" role="alert">{error}</p> : habits.length === 0 ? (
        <p className="supporting-text">続けたいことを、小さな行動から始めます。</p>
      ) : (
        <>
          <p className="supporting-text">使用中 {active.length}件{paused.length > 0 && `・休止中 ${paused.length}件`}</p>
          {active.length > 0 && <ul className="habit-entry-names">
            {active.slice(0, 5).map((habit) => <li key={habit.id}>{habit.name}</li>)}
          </ul>}
          {active.length > 5 && <p className="supporting-text">ほか{active.length - 5}件</p>}
        </>
      )}
      <button type="button" className="secondary-button" onClick={onOpen}>
        {!error && habits.length === 0 ? '習慣を作る' : '習慣を見る'}
      </button>
    </section>
  )
}
