import { useState } from 'react'
import {
  dayPeriods,
  type DayPeriod,
  type LoosePlan,
} from './LoosePlanStorage'

type LoosePlanDraft = Omit<LoosePlan, 'id'>

type LoosePlanPanelProps = {
  plans: LoosePlan[]
  date: string
  heading: string
  showAddButtons: boolean
  collapsible?: boolean
  hideWhenEmpty?: boolean
  onSave: (plan: LoosePlan) => void
  onDelete: (planId: string) => void
  onToggleComplete: (planId: string) => void
}

function formatDateLabel(dateText: string) {
  const [yearText, monthText, dayText] = dateText.split('-')
  const date = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  )

  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function sortPlansForDisplay(plans: LoosePlan[]) {
  return plans
    .map((plan, index) => ({ plan, index }))
    .sort((firstPlan, secondPlan) => {
      if (firstPlan.plan.completed === secondPlan.plan.completed) {
        return firstPlan.index - secondPlan.index
      }

      return firstPlan.plan.completed ? 1 : -1
    })
    .map(({ plan }) => plan)
}

function LoosePlanPanel({
  plans,
  date,
  heading,
  showAddButtons,
  collapsible = false,
  hideWhenEmpty = false,
  onSave,
  onDelete,
  onToggleComplete,
}: LoosePlanPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isShowingEditor, setIsShowingEditor] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(
    null,
  )
  const [planDraft, setPlanDraft] = useState<LoosePlanDraft>({
    title: '',
    date,
    dayPeriod: 'morning',
    memo: '',
    completed: false,
  })
  const [planError, setPlanError] = useState('')

  const plansForDate = plans.filter((plan) => plan.date === date)

  if (hideWhenEmpty && plansForDate.length === 0) {
    return null
  }

  function startAddingPlan(dayPeriod: DayPeriod) {
    setPlanDraft({
      title: '',
      date,
      dayPeriod,
      memo: '',
      completed: false,
    })
    setEditingPlanId(null)
    setPlanError('')
    setIsShowingEditor(true)
  }

  function startEditingPlan(plan: LoosePlan) {
    setPlanDraft({
      title: plan.title,
      date: plan.date,
      dayPeriod: plan.dayPeriod,
      memo: plan.memo,
      completed: plan.completed,
    })
    setEditingPlanId(plan.id)
    setPlanError('')
    setIsShowingEditor(true)
  }

  function cancelEditingPlan() {
    setEditingPlanId(null)
    setPlanError('')
    setIsShowingEditor(false)
  }

  function savePlan() {
    const cleanedTitle = planDraft.title.trim()

    if (cleanedTitle === '') {
      setPlanError('予定名を入力してください。')
      return
    }

    onSave({
      id: editingPlanId ?? crypto.randomUUID(),
      title: cleanedTitle,
      date,
      dayPeriod: planDraft.dayPeriod,
      memo: planDraft.memo,
      completed: planDraft.completed,
    })
    cancelEditingPlan()
  }

  function deletePlan() {
    if (editingPlanId === null) {
      return
    }

    const shouldDelete = window.confirm(
      'このゆるい予定を削除しますか？',
    )

    if (!shouldDelete) {
      return
    }

    onDelete(editingPlanId)
    cancelEditingPlan()
  }

  return (
    <section className="card loose-plan-panel">
      <div className="card-heading">
        <div>
          <p className="section-label">{heading}</p>
          <h2 className="card-title">{formatDateLabel(date)}</h2>
        </div>

        {collapsible && (
          <button
            className="loose-plan-toggle"
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
          >
            {isExpanded ? '折りたたむ' : '表示する'}
          </button>
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <>
          <div className="loose-plan-groups">
            {dayPeriods.map((dayPeriod) => {
              const plansForPeriod = sortPlansForDisplay(
                plansForDate.filter(
                  (plan) => plan.dayPeriod === dayPeriod.value,
                ),
              )

              return (
                <section
                  key={dayPeriod.value}
                  className="loose-plan-group"
                >
                  <div className="loose-plan-group-heading">
                    <h3>{dayPeriod.label}</h3>
                    {showAddButtons && (
                      <button
                        className="loose-plan-add-button"
                        type="button"
                        onClick={() => startAddingPlan(dayPeriod.value)}
                      >
                        追加する
                      </button>
                    )}
                  </div>

                  {plansForPeriod.length === 0 ? (
                    <p className="loose-plan-empty">予定はありません</p>
                  ) : (
                    <div className="loose-plan-list">
                      {plansForPeriod.map((plan) => (
                        <div
                          key={plan.id}
                          className={`loose-plan-row ${
                            plan.completed ? 'completed' : ''
                          }`}
                        >
                          <button
                            className="loose-plan-complete-button"
                            type="button"
                            aria-label={`${plan.title}を${
                              plan.completed ? '未完了' : '完了'
                            }にする`}
                            aria-pressed={plan.completed}
                            onClick={() => onToggleComplete(plan.id)}
                          >
                            {plan.completed ? '✓' : '○'}
                          </button>
                          <button
                            className="loose-plan-title-button"
                            type="button"
                            onClick={() => startEditingPlan(plan)}
                          >
                            {plan.title}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          {isShowingEditor && (
            <div className="loose-plan-editor">
              <p className="section-label">
                {editingPlanId === null
                  ? 'ゆるい予定を追加'
                  : 'ゆるい予定を編集'}
              </p>

              <div className="form-field">
                <label className="input-label" htmlFor="loose-plan-title">
                  予定名
                </label>
                <input
                  id="loose-plan-title"
                  className="entry-input"
                  type="text"
                  value={planDraft.title}
                  onChange={(event) =>
                    setPlanDraft((currentPlan) => ({
                      ...currentPlan,
                      title: event.target.value,
                    }))
                  }
                  placeholder="例：洗濯をする"
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="input-label" htmlFor="loose-plan-period">
                  時間帯
                </label>
                <select
                  id="loose-plan-period"
                  className="entry-input"
                  value={planDraft.dayPeriod}
                  onChange={(event) =>
                    setPlanDraft((currentPlan) => ({
                      ...currentPlan,
                      dayPeriod: event.target.value as DayPeriod,
                    }))
                  }
                >
                  {dayPeriods.map((dayPeriod) => (
                    <option
                      key={dayPeriod.value}
                      value={dayPeriod.value}
                    >
                      {dayPeriod.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="input-label" htmlFor="loose-plan-memo">
                  メモ（任意）
                </label>
                <textarea
                  id="loose-plan-memo"
                  className="entry-input loose-plan-memo-input"
                  value={planDraft.memo}
                  onChange={(event) =>
                    setPlanDraft((currentPlan) => ({
                      ...currentPlan,
                      memo: event.target.value,
                    }))
                  }
                  placeholder="例：洗剤を買う"
                  rows={4}
                />
              </div>

              <label className="loose-plan-completed-field">
                <input
                  type="checkbox"
                  checked={planDraft.completed}
                  onChange={(event) =>
                    setPlanDraft((currentPlan) => ({
                      ...currentPlan,
                      completed: event.target.checked,
                    }))
                  }
                />
                完了にする
              </label>

              {planError !== '' && (
                <p className="weekly-editor-error">{planError}</p>
              )}

              <div className="editor-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={savePlan}
                >
                  保存する
                </button>
                <button
                  className="cancel-button"
                  type="button"
                  onClick={cancelEditingPlan}
                >
                  やめる
                </button>
              </div>

              {editingPlanId !== null && (
                <button
                  className="delete-task-button loose-plan-delete-button"
                  type="button"
                  onClick={deletePlan}
                >
                  予定を削除する
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default LoosePlanPanel
