import { useEffect, useRef, useState } from 'react'
import LoosePlanPanel from './LoosePlans'
import { dayPeriods, getLocalDate, type LoosePlan } from './LoosePlanStorage'
import { canCreateDailyRecord, parseDurationInput, type DailyRecord, type DailyRecordInput } from './DailyRecordStorage'

type Props = {
  date: string
  mode?: 'today' | 'create' | 'edit'
  backLabel?: string
  record?: DailyRecord
  loadError: string
  loosePlans: LoosePlan[]
  onBack: () => void
  onSave: (record: DailyRecordInput) => void
  onSaveLoosePlan: (plan: LoosePlan) => void
  onDeleteLoosePlan: (planId: string) => void
  onToggleLoosePlanComplete: (planId: string) => void
}

type TimeInput = { hours: string; minutes: string }

function toTimeInput(minutes: number | null | undefined): TimeInput {
  return minutes == null
    ? { hours: '', minutes: '' }
    : { hours: String(Math.floor(minutes / 60)), minutes: String(minutes % 60) }
}

type DurationFieldProps = {
  id: string
  label: string
  value: TimeInput
  disabled?: boolean
  error: string
  onChange: (value: TimeInput) => void
}

function DurationFields({ id, label, value, disabled = false, error, onChange }: DurationFieldProps) {
  return (
    <div className="end-of-day-duration" role="group" aria-label={label}>
      <div className="end-of-day-time-inputs">
        {(['hours', 'minutes'] as const).map((field) => (
          <label className="end-of-day-time-field" key={field}>
            <input
              id={`${id}-${field}`}
              className="entry-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label={`${label}の${field === 'hours' ? '時間' : '分'}`}
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
              aria-invalid={error !== ''}
              value={value[field]}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, [field]: event.target.value })}
            />
            <span>{field === 'hours' ? '時間' : '分'}</span>
          </label>
        ))}
      </div>
      {error && <p className="end-of-day-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}

function EndOfDay({
  date, mode = 'today', backLabel = '今日へ戻る', record, loadError, loosePlans, onBack, onSave,
  onSaveLoosePlan, onDeleteLoosePlan, onToggleLoosePlanComplete,
}: Props) {
  const [screenTime, setScreenTime] = useState(() => toTimeInput(record?.screenTimeMinutes))
  const [unintendedTime, setUnintendedTime] = useState(() => toTimeInput(record?.unintendedMinutes))
  const [insight, setInsight] = useState(record?.insight ?? '')
  const [savedPlans, setSavedPlans] = useState(() => record?.loosePlans.map((plan) => ({ ...plan })) ?? [])
  const [tomorrowDate] = useState(() => getLocalDate(1))
  const [dateChanged, setDateChanged] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [unintendedError, setUnintendedError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')
  const insightRef = useRef<HTMLTextAreaElement>(null)
  const displayedPlans = mode === 'edit' ? savedPlans : loosePlans.filter((plan) => plan.date === date)
  const screenTimeIsEmpty = screenTime.hours.trim() === '' && screenTime.minutes.trim() === ''

  useEffect(() => {
    if (mode === 'edit') return
    function checkDate() {
      if (mode === 'today' ? date !== getLocalDate() : !canCreateDailyRecord(date)) {
        setDateChanged(true)
      }
    }
    const intervalId = window.setInterval(checkDate, 60000)
    window.addEventListener('focus', checkDate)
    window.addEventListener('pageshow', checkDate)
    document.addEventListener('visibilitychange', checkDate)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkDate)
      window.removeEventListener('pageshow', checkDate)
      document.removeEventListener('visibilitychange', checkDate)
    }
  }, [date, mode])

  useEffect(() => {
    const textarea = insightRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`
    }
  }, [insight])

  function checkDateBeforeAction() {
    if (mode === 'edit' || (mode === 'today' ? date === getLocalDate() : canCreateDailyRecord(date))) {
      return true
    }
    setDateChanged(true)
    return false
  }

  function changeScreenTime(value: TimeInput) {
    setScreenTime(value)
    setScreenError('')
    setUnintendedError('')
    setMessage('')
    if (value.hours.trim() === '' && value.minutes.trim() === '') {
      setUnintendedTime({ hours: '', minutes: '' })
    }
  }

  function save() {
    setMessage('')
    setSaveError('')
    if (!checkDateBeforeAction()) return

    const screen = parseDurationInput(screenTime.hours, screenTime.minutes, 'スクリーンタイム')
    const unintended = parseDurationInput(unintendedTime.hours, unintendedTime.minutes, '意図せず使った時間')
    let nextUnintendedError = unintended.error
    if (!nextUnintendedError && unintended.minutes !== null &&
      (screen.minutes === null || unintended.minutes > screen.minutes)) {
      nextUnintendedError = '意図せず使った時間は、スクリーンタイム以下で入力してください。'
    }
    setScreenError(screen.error)
    setUnintendedError(nextUnintendedError)
    if (screen.error || nextUnintendedError) return

    try {
      onSave({
        date,
        screenTimeMinutes: screen.minutes,
        unintendedMinutes: unintended.minutes,
        insight,
        loosePlans: displayedPlans,
      })
      if (mode === 'today') {
        setMessage(record ? '今日の記録を更新しました。' : '今日の記録を保存しました。')
      }
    } catch (error) {
      if (!checkDateBeforeAction()) return
      setSaveError(mode !== 'today' && error instanceof Error
        ? error.message
        : '記録を保存できませんでした。保存済みの記録や、端末の空き容量・ブラウザーの保存設定を確認してください。入力内容はこの画面に残しています。')
    }
  }

  return (
    <div className="end-of-day-page">
      <header className="end-of-day-header">
        <button className="cancel-button" type="button" onClick={onBack}>{backLabel}</button>
        <h1 className="card-title">{mode === 'today' ? '一日の終わり' : mode === 'edit' ? '記録を編集' : 'この日を記録'}</h1>
        <p className="end-of-day-date">
          {new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
            .format(new Date(`${date}T12:00:00`))}
        </p>
      </header>

      {dateChanged ? (
        <p className="card end-of-day-date-notice" role="alert">
          {mode === 'today'
            ? '日付が変わりました。内容を確認するため、一日の終わりを開き直してください。'
            : '日付が変わり、この日の記録を新しく作成できる期間を過ぎました。'}
        </p>
      ) : (
        <>
          <section className="card end-of-day-section">
            <h2 className="closing-title">{mode === 'today' ? '今日のゆるい予定' : mode === 'edit' ? '保存されたゆるい予定' : 'この日のゆるい予定'}</h2>
            <p className="supporting-text">
              {displayedPlans.length === 0
                ? (mode === 'today' ? '今日のゆるい予定はありません。' : 'この日のゆるい予定はありません。')
                : `${displayedPlans.length}件中${displayedPlans.filter((plan) => plan.completed).length}件を完了`}
            </p>
            {mode === 'edit' && <p className="supporting-text">保存された予定の完了状態だけを訂正できます。元の予定には反映されません。</p>}
            {dayPeriods.map((period) => {
              const plans = displayedPlans.map((plan, index) => ({ plan, index }))
                .filter(({ plan }) => plan.dayPeriod === period.value)
              return plans.length > 0 && (
                <div className="end-of-day-plan-group" key={period.value}>
                  {plans.map(({ plan, index }) => (
                    <div className={`end-of-day-plan${plan.completed ? ' completed' : ''}`} key={`${plan.id}-${index}`}>
                      <span>{period.label}</span>
                      <button className="end-of-day-complete-button" type="button"
                        aria-label={`${plan.title}を${plan.completed ? '未完了' : '完了'}にする`}
                        aria-pressed={plan.completed}
                        onClick={() => {
                          if (checkDateBeforeAction()) {
                            if (mode === 'edit') {
                              setSavedPlans((currentPlans) => currentPlans.map((savedPlan, savedIndex) =>
                                savedIndex === index ? { ...savedPlan, completed: !savedPlan.completed } : savedPlan))
                            } else {
                              onToggleLoosePlanComplete(plan.id)
                            }
                            setMessage('')
                          }
                        }}>
                        {plan.completed ? '✓' : '○'}
                      </button>
                      <span className="end-of-day-plan-title">{plan.title}</span>
                      {mode === 'edit' && plan.memo && <span className="record-plan-memo">{plan.memo}</span>}
                    </div>
                  ))}
                </div>
              )
            })}
          </section>

          <section className="card end-of-day-section">
            <h2 className="closing-title">{mode === 'today' ? '今日のスクリーンタイム' : 'スクリーンタイム'}</h2>
            <p className="supporting-text" id="screen-time-help">
              iPhoneとiPadを合わせた、{mode === 'today' ? '今日' : 'この日'}のスクリーンタイムを入力します（任意）。設定アプリのスクリーンタイムから確認できます。
            </p>
            <DurationFields id="screen-time" label="スクリーンタイム" value={screenTime}
              error={screenError} onChange={changeScreenTime} />

            <div className="end-of-day-input-group">
              <h2 className="closing-title">意図せず使った時間</h2>
              <p className="supporting-text" id="unintended-time-help">
                スクリーンタイムのうち、振り返って必要以上だったと感じる時間です（任意）。
                {screenTimeIsEmpty && 'スクリーンタイムを入力すると記録できます。'}
              </p>
              <DurationFields id="unintended-time" label="意図せず使った時間" value={unintendedTime}
                disabled={screenTimeIsEmpty} error={unintendedError}
                onChange={(value) => { setUnintendedTime(value); setUnintendedError(''); setMessage('') }} />
            </div>
          </section>

          <section className="card end-of-day-section">
            <label className="closing-title" htmlFor="daily-insight">{mode === 'today' ? '今日' : 'この日'}、気づいたことはありますか？</label>
            <p className="supporting-text" id="daily-insight-help">集中できた場面や、気になったことを短く残せます。</p>
            <textarea ref={insightRef} id="daily-insight" className="entry-input end-of-day-insight"
              rows={3} value={insight} aria-describedby="daily-insight-help"
              onChange={(event) => { setInsight(event.target.value); setMessage('') }} />
          </section>

          {mode === 'today' && <LoosePlanPanel
            plans={loosePlans} date={tomorrowDate} heading="明日のゆるい予定"
            onSave={(plan) => { if (checkDateBeforeAction()) onSaveLoosePlan(plan) }}
            onDelete={(planId) => { if (checkDateBeforeAction()) onDeleteLoosePlan(planId) }}
            onToggleComplete={(planId) => { if (checkDateBeforeAction()) onToggleLoosePlanComplete(planId) }}
          />}

          <div className="end-of-day-save">
            {loadError && <p className="end-of-day-error" role="alert">{loadError}</p>}
            {saveError && <p className="end-of-day-error" role="alert">{saveError}</p>}
            <button className="primary-button" type="button" onClick={save}>
              {mode === 'edit' ? '変更を保存する' : mode === 'create' ? 'この日を記録する'
                : record ? '今日の記録を更新する' : '今日を記録する'}
            </button>
            {message && <p className="supporting-text" role="status">{message}</p>}
            <p className="supporting-text">{mode === 'edit'
              ? '完了状態・時間・気づきは、このボタンで保存します。'
              : '予定の変更はそのつど保存されます。時間と気づきは、このボタンで保存します。'}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default EndOfDay
