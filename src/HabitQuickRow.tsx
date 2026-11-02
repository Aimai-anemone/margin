import { habitSteps, type Habit, type HabitResult } from './HabitStorage'

type Props = {
  habit: Habit
  result?: HabitResult
  disabled?: boolean
  onOpen: () => void
  onSelect: (result: 1 | 2 | 3) => void
}

export default function HabitQuickRow({ habit, result, disabled = false, onOpen, onSelect }: Props) {
  return <div className="habit-quick-row">
    <button type="button" className="habit-quick-name-button" onClick={onOpen}
      aria-label={`${habit.name}の記録詳細を開く`}>
      <span className="habit-quick-name">{habit.name}</span>
      {result === 'rest' && <span className="habit-quick-rest">休み</span>}
    </button>
    <div className="habit-quick-choices" role="group" aria-label={`${habit.name}の記録`}>
      {habitSteps.map((step) => <button key={step.value} type="button"
        className="habit-quick-choice" aria-label={`${habit.name}を${step.label}で記録`}
        aria-pressed={result === step.value} disabled={disabled}
        onClick={() => { if (result !== step.value) onSelect(step.value) }}>
        {step.label}
      </button>)}
    </div>
  </div>
}
