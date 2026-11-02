import { useState } from 'react'
import { isHabitDue, type HabitResult } from './HabitStorage'
import { storageFailureMessage } from './StorageSafety'
import { type HabitsController } from './useHabits'
import HabitQuickRow from './HabitQuickRow'

type Props = { controller: HabitsController; onOpen: (habitId?: string) => void }

export default function TodayHabitsCard({ controller, onOpen }: Props) {
  const { habits, records } = controller.data
  const { today, error } = controller
  const [saveError, setSaveError] = useState('')
  const active = habits.filter((habit) => isHabitDue(habit, today))
  const recorded = new Map(records.filter((record) => record.date === today).map((record) => [record.habitId, record]))

  function recordHabit(id: string, result: HabitResult) {
    if (error || recorded.get(id)?.result === result) return
    setSaveError('')
    try { controller.record(id, today, result) }
    catch (failure) { setSaveError(storageFailureMessage(failure)) }
  }

  return (
    <section className="card habit-entry">
      <div className="habit-entry-heading">
        <h2 className="closing-title">今日の習慣</h2>
        {!error && active.length > 0 && <span className="habit-entry-count">記録 {active.filter((habit) => recorded.has(habit.id)).length} / {active.length}</span>}
      </div>
      {(error || saveError) && <p className="storage-message" role="alert">{error || saveError}</p>}
      {error ? null : habits.length === 0 ? (
        <p className="supporting-text quiet-empty">続けたいことを、小さな行動から始めます。</p>
      ) : (
        <>
          {active.length === 0 && <p className="supporting-text quiet-empty">今日は対象の習慣はありません。</p>}
          {active.length > 0 && <ul className="habit-entry-names">
            {active.slice(0, 5).map((habit) => <li key={habit.id}><HabitQuickRow habit={habit}
              result={recorded.get(habit.id)?.result} onOpen={() => onOpen(habit.id)}
              onSelect={(result) => recordHabit(habit.id, result)} /></li>)}
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
