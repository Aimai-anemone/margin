import { useState } from 'react'
import {
  dayPeriods,
  getLocalDate,
  type DayPeriod,
  type LoosePlan,
} from './LoosePlanStorage'

type LoosePlanDraft = Omit<LoosePlan, 'id'>

type LoosePlanPanelProps = {
  plans: LoosePlan[]
  date: string
  heading: string
  collapsible?: boolean
  stickyHeading?: boolean
  compact?: boolean
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

function getDayPeriodLabel(dayPeriod: DayPeriod) {
  return dayPeriods.find((period) => period.value === dayPeriod)?.label ?? ''
}

function getCollapsedSummary(
  plans: LoosePlan[],
  showCompletionMark: boolean,
) {
  if (plans.length === 0) {
    return '予定なし'
  }

  const [firstPlan] = plans
  const completionMark = showCompletionMark
    ? `${firstPlan.completed ? '✓' : '○'} `
    : ''
  const additionalPlans =
    plans.length > 1 ? ` ほか${plans.length - 1}件` : ''

  return `${completionMark}${firstPlan.title}${additionalPlans}`
}

function LoosePlanPanel({
  plans,
  date,
  heading,
  collapsible = false,
  stickyHeading = false,
  compact = false,
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
  const isToday = date === getLocalDate()
  const plansByPeriod = dayPeriods.map((dayPeriod) => ({
    ...dayPeriod,
    plans: sortPlansForDisplay(
      plansForDate.filter((plan) => plan.dayPeriod === dayPeriod.value),
    ),
  }))

  function startAddingPlan(dayPeriod: DayPeriod) {
    const hasExistingPlan = plansForDate.some(
      (plan) => plan.dayPeriod === dayPeriod,
    )

    if (hasExistingPlan) {
      return
    }

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

    const hasExistingPlan = plansForDate.some(
      (plan) => plan.dayPeriod === planDraft.dayPeriod,
    )

    if (editingPlanId === null && hasExistingPlan) {
      setPlanError('この時間帯には、すでに予定があります。')
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
    <section
      className={`card loose-plan-panel ${
        stickyHeading ? 'weekly-loose-plan-panel' : ''
      } ${compact ? 'loose-plan-panel-compact' : ''}`}
    >
      {collapsible && !isExpanded ? (
        <button
          className={`loose-plan-collapsed-bar ${
            stickyHeading && !isShowingEditor
              ? 'loose-plan-collapsed-bar-sticky'
              : ''
          }`}
          type="button"
          aria-expanded={false}
          onClick={() => setIsExpanded(true)}
        >
          <span className="loose-plan-collapsed-heading">
            <span className="loose-plan-collapsed-title">{heading}</span>
            <span className="loose-plan-collapsed-date">
              {formatDateLabel(date)}
            </span>
          </span>
          <span className="loose-plan-collapsed-summary">
            {plansByPeriod.map((dayPeriod) => (
              <span
                key={dayPeriod.value}
                className={`loose-plan-collapsed-summary-item ${
                  dayPeriod.plans.length === 0
                    ? 'empty'
                    : isToday && dayPeriod.plans.every((plan) => plan.completed)
                      ? 'completed'
                      : ''
                }`}
              >
                <span>{dayPeriod.label}:</span>
                <span>
                  {getCollapsedSummary(dayPeriod.plans, isToday)}
                </span>
              </span>
            ))}
          </span>
        </button>
      ) : (
        <div className="card-heading loose-plan-panel-heading">
          <div className="loose-plan-panel-title-row">
            <h2 className="loose-plan-panel-title">{heading}</h2>
            <p className="loose-plan-date">{formatDateLabel(date)}</p>
          </div>

          {collapsible && (
            <button
              className="loose-plan-toggle"
              type="button"
              aria-expanded={true}
              onClick={() => setIsExpanded(false)}
            >
              折りたたむ
            </button>
          )}
        </div>
      )}

      {(!collapsible || isExpanded) && (
        <div className="loose-plan-panel-content">
          {compact ? (
            <div className="loose-plan-compact-summary">
              {plansByPeriod.map((dayPeriod) => (
                <section
                  key={dayPeriod.value}
                  className="loose-plan-compact-period"
                >
                  <span className="loose-plan-compact-period-label">
                    {dayPeriod.label}：
                  </span>
                  {dayPeriod.plans.length === 0 ? (
                    <button
                      className="loose-plan-compact-empty-button"
                      type="button"
                      aria-label={`${dayPeriod.label}の予定を追加する`}
                      onClick={() => startAddingPlan(dayPeriod.value)}
                    >
                      予定なし
                    </button>
                  ) : (
                    <div className="loose-plan-compact-plan-list">
                      {dayPeriod.plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`loose-plan-compact-plan ${
                            isToday && plan.completed ? 'completed' : ''
                          } ${isToday ? '' : 'without-completion'}`}
                        >
                          {isToday && (
                            <button
                              className="loose-plan-compact-complete-button"
                              type="button"
                              aria-label={`${plan.title}を${
                                plan.completed ? '未完了' : '完了'
                              }にする`}
                              aria-pressed={plan.completed}
                              onClick={() => onToggleComplete(plan.id)}
                            >
                              {plan.completed ? '✓' : '○'}
                            </button>
                          )}
                          <button
                            className="loose-plan-compact-title-button"
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
              ))}
            </div>
          ) : (
            <div className="loose-plan-groups">
              {plansByPeriod.map((dayPeriod) => {
                return (
                  <section key={dayPeriod.value} className="loose-plan-group">
                    {dayPeriod.plans.length === 0 ? (
                      <div className="loose-plan-row loose-plan-row-empty">
                        <span className="loose-plan-period-label">
                          {dayPeriod.label}
                        </span>
                        <span
                          className="loose-plan-complete-placeholder"
                          aria-hidden="true"
                        />
                        <button
                          className="loose-plan-empty-button"
                          type="button"
                          onClick={() => startAddingPlan(dayPeriod.value)}
                        >
                          予定なし
                        </button>
                      </div>
                    ) : (
                      <div className="loose-plan-list">
                        {dayPeriod.plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`loose-plan-row ${
                              isToday && plan.completed ? 'completed' : ''
                            } ${isToday ? '' : 'without-completion'}`}
                          >
                            <span className="loose-plan-period-label">
                              {dayPeriod.label}
                            </span>
                            {isToday && (
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
                            )}
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
          )}

          {isShowingEditor && (
            <div className="loose-plan-editor">
              <p className="section-label">
                {editingPlanId === null
                  ? 'ゆるい予定を追加'
                  : 'ゆるい予定を編集'}
              </p>

              <p className="loose-plan-editor-date">
                対象日：{formatDateLabel(date)}
              </p>

              <p className="loose-plan-editor-period">
                時間帯：{getDayPeriodLabel(planDraft.dayPeriod)}
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
        </div>
      )}
    </section>
  )
}

export default LoosePlanPanel
