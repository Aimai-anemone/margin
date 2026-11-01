import { useState } from 'react'
import { habitSteps, habitWeekdays, type Habit, type HabitDraft } from './HabitStorage'
import { storageFailureMessage } from './StorageSafety'
import { type HabitsController } from './useHabits'

const emptyDraft = (): HabitDraft => ({
  name: '', steps: { 1: '', 2: '', 3: '' }, frequency: 'daily', weekdays: [], trigger: '',
})
type Editor = { id?: string; draft: HabitDraft; initial: string }
type Props = { controller: HabitsController; onBack: () => void }

function frequencyLabel(habit: Habit) {
  return habit.frequency === 'daily' ? '毎日'
    : [...habit.weekdays].sort((a, b) => a - b).map((day) => habitWeekdays[day]).join('・')
}

export default function HabitsPage({ controller, onBack }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { habits } = controller.data
  const dirty = editor !== null && JSON.stringify(editor.draft) !== editor.initial

  function canClose() {
    return !dirty || window.confirm('入力した内容を破棄しますか？')
  }

  function openEditor(habit?: Habit) {
    if (controller.error) return
    if (!canClose()) return
    const draft: HabitDraft = habit ? {
      name: habit.name, steps: { ...habit.steps }, frequency: habit.frequency,
      weekdays: [...habit.weekdays], trigger: habit.trigger,
    } : emptyDraft()
    setEditor({ id: habit?.id, draft, initial: JSON.stringify(draft) })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0 })
  }

  function changeDraft(change: Partial<HabitDraft>) {
    if (editor) setEditor({ ...editor, draft: { ...editor.draft, ...change } })
    setError('')
  }

  function perform(operation: () => void, success: string) {
    if (controller.error) return false
    setMessage('')
    try {
      operation()
      setError('')
      setMessage(success)
      return true
    } catch (failure) {
      setError(storageFailureMessage(failure))
      return false
    }
  }

  function save() {
    if (!editor || controller.error) return
    if (perform(() => controller.save(editor.draft, editor.id), '習慣を保存しました。')) {
      setEditor(null)
    }
  }

  function remove(habit: Habit) {
    if (controller.error) return
    if (!window.confirm(`「${habit.name}」を完全に削除しますか？\nこの習慣と、これまでのすべての実績が削除されます。この操作は元に戻せません。`)) return
    perform(() => controller.remove(habit.id), '習慣と関連する実績を削除しました。')
  }

  return (
    <div className="habits-page">
      <header className="habit-page-heading">
        <button className="cancel-button" type="button" onClick={() => { if (canClose()) onBack() }}>今日へ戻る</button>
        <h1 className="card-title">習慣</h1>
        <p className="supporting-text">続けたいことを、無理のない形で整えます。</p>
      </header>
      {(controller.error || (!editor && error)) && <p className="storage-message" role="alert">{controller.error || error}</p>}
      {message && <p className="supporting-text" role="status">{message}</p>}

      {editor ? (
        <form className="card habit-editor" onSubmit={(event) => { event.preventDefault(); save() }}>
          <h2 className="closing-title">{editor.id ? '習慣を編集' : '習慣を作る'}</h2>
          <p className="supporting-text">習慣名と3つの内容は必須です。</p>
          <label className="form-field" htmlFor="habit-name">
            <span className="input-label">習慣名（必須）</span>
            <input id="habit-name" className="entry-input" required value={editor.draft.name}
              onChange={(event) => changeDraft({ name: event.target.value })} />
          </label>
          {habitSteps.map((step) => (
            <label className="form-field" key={step.value} htmlFor={`habit-step-${step.value}`}>
              <span className="input-label">{step.label}（必須）</span>
              <span className="supporting-text" id={`habit-step-${step.value}-help`}>{step.help}</span>
              <textarea id={`habit-step-${step.value}`} className="entry-input" rows={2} required
                aria-describedby={`habit-step-${step.value}-help`} value={editor.draft.steps[step.value]}
                onChange={(event) => changeDraft({ steps: { ...editor.draft.steps, [step.value]: event.target.value } })} />
            </label>
          ))}
          <fieldset className="habit-frequency">
            <legend className="input-label">実行する日</legend>
            <div className="habit-frequency-options" role="group" aria-label="実行頻度">
              {(['daily', 'weekdays'] as const).map((frequency) => (
                <button key={frequency} type="button" className="habit-choice"
                  aria-pressed={editor.draft.frequency === frequency}
                  onClick={() => changeDraft({ frequency, weekdays: frequency === 'daily' ? [] : editor.draft.weekdays })}>
                  {frequency === 'daily' ? '毎日' : '曜日を選択'}
                </button>
              ))}
            </div>
            {editor.draft.frequency === 'weekdays' && <div className="habit-weekdays" role="group" aria-label="実行する曜日（1日以上）">
              {habitWeekdays.map((label, day) => (
                <button className="habit-choice" type="button" key={day} aria-label={`${label}曜日`}
                  aria-pressed={editor.draft.weekdays.includes(day)} onClick={() => changeDraft({
                    weekdays: editor.draft.weekdays.includes(day) ? editor.draft.weekdays.filter((value) => value !== day)
                      : [...editor.draft.weekdays, day],
                  })}>{label}</button>
              ))}
            </div>}
          </fieldset>
          <label className="form-field" htmlFor="habit-trigger">
            <span className="input-label">始めるきっかけ（任意）</span>
            <span className="supporting-text" id="habit-trigger-help">いつ、どこで、何の後に始めるかを決められます。</span>
            <textarea id="habit-trigger" className="entry-input" rows={3} value={editor.draft.trigger}
              aria-describedby="habit-trigger-help" onChange={(event) => changeDraft({ trigger: event.target.value })} />
          </label>
          <p className="supporting-text">習慣名・各内容は200文字、きっかけは10,000文字までです。</p>
          {error && <p className="storage-message" role="alert">{error}</p>}
          <div className="habit-actions">
            <button className="primary-button" type="submit" disabled={!!controller.error}>保存する</button>
            <button className="cancel-button" type="button" onClick={() => {
              if (canClose()) { setEditor(null); setError('') }
            }}>キャンセル</button>
          </div>
        </form>
      ) : (
        <>
          {!controller.error && <button className="primary-button" type="button" onClick={() => openEditor()}>習慣を追加する</button>}
          {(['active', 'paused'] as const).map((status) => {
            const items = habits.filter((habit) => habit.status === status)
            return items.length > 0 && <section className="card habit-group" key={status}>
              <h2 className="closing-title">{status === 'active' ? '使用中' : '休止中'}・{items.length}件</h2>
              {items.map((habit) => <div className="habit-item" key={habit.id}>
                <h3>{habit.name}</h3>
                <p className="supporting-text">{frequencyLabel(habit)}</p>
                {status === 'active' && habit.trigger && <p className="habit-trigger-preview">{habit.trigger}</p>}
                <div className="habit-actions">
                  <button className="secondary-button" type="button" disabled={!!controller.error} onClick={() => openEditor(habit)}>編集する</button>
                  <button className={status === 'active' ? 'secondary-button' : 'primary-button'} type="button" disabled={!!controller.error} onClick={() => perform(
                    () => controller.changeStatus(habit.id, status === 'active' ? 'paused' : 'active'),
                    status === 'active' ? '習慣を休止しました。' : '習慣を再開しました。',
                  )}>{status === 'active' ? '休止する' : '再開する'}</button>
                  <button className="cancel-button" type="button" disabled={!!controller.error} onClick={() => perform(
                    () => controller.changeStatus(habit.id, 'hidden'), '習慣を一覧から非表示にしました。',
                  )}>一覧から非表示</button>
                </div>
              </div>)}
            </section>
          })}
          {habits.some((habit) => habit.status === 'hidden') && <section className="card habit-group">
            <button className="habit-hidden-toggle" type="button" aria-expanded={showHidden} aria-controls="hidden-habits"
              onClick={() => setShowHidden(!showHidden)}>
              非表示にした習慣・{habits.filter((habit) => habit.status === 'hidden').length}件 {showHidden ? '閉じる' : '開く'}
            </button>
            {showHidden && <div id="hidden-habits">
              <p className="supporting-text">元に戻すと休止中になります。再開すると使用中に戻ります。</p>
              {habits.filter((habit) => habit.status === 'hidden').map((habit) => <div className="habit-item" key={habit.id}>
                <h3>{habit.name}</h3>
                <button className="secondary-button" type="button" disabled={!!controller.error} onClick={() => perform(
                  () => controller.changeStatus(habit.id, 'paused'), '習慣を休止中へ戻しました。',
                )}>元に戻す</button>
                <button className="delete-button habit-delete" type="button" disabled={!!controller.error} onClick={() => remove(habit)}>完全に削除する</button>
              </div>)}
            </div>}
          </section>}
        </>
      )}
    </div>
  )
}
