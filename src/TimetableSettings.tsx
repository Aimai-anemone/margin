import { useState } from 'react'
import {
  MAX_PERIODS, isTimetableSettings, validatePeriodTimes,
  type DayMode, type TimetableSettings as Settings,
} from './TimetableStorage'

type Props = {
  settings: Settings
  onSave: (settings: Settings) => void
}

function TimetableSettings({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function save() {
    setMessage('')
    const nextError = validatePeriodTimes(draft.periods, draft.periodCount)
    setError(nextError)
    if (nextError) return
    const nextSettings = {
      ...settings,
      dayMode: draft.dayMode,
      periodCount: draft.periodCount,
      periods: draft.periods,
    }
    if (!isTimetableSettings(nextSettings)) {
      setError('時刻設定を確認してください。非表示の時限も、開始より後に終了する必要があります。')
      return
    }
    try {
      onSave(nextSettings)
      setMessage('時間割の設定を保存しました。')
    } catch {
      setError('設定を保存できませんでした。端末の空き容量やブラウザーの保存設定を確認してください。')
    }
  }

  return (
    <section className="card timetable-settings">
      <h2 className="card-title">時間割の設定</h2>
      <p className="supporting-text">
        表示する曜日と時限を選びます。表示を減らしても、授業は残ります。
      </p>
      <div className="course-schedule-fields">
        <div className="form-field">
          <label className="input-label" htmlFor="timetable-days">表示する曜日</label>
          <select id="timetable-days" className="entry-input" value={draft.dayMode}
            onChange={(event) => {
              setDraft({ ...draft, dayMode: event.target.value as DayMode })
              setMessage('')
            }}>
            <option value="weekdays">平日のみ</option>
            <option value="saturday">平日＋土曜日</option>
            <option value="weekend">平日＋土日</option>
          </select>
        </div>
        <div className="form-field">
          <label className="input-label" htmlFor="timetable-count">時限数</label>
          <select id="timetable-count" className="entry-input" value={draft.periodCount}
            onChange={(event) => {
              setDraft({ ...draft, periodCount: Number(event.target.value) })
              setMessage('')
            }}>
            {Array.from({ length: MAX_PERIODS }, (_, index) => (
              <option key={index} value={index + 1}>{index + 1}限まで</option>
            ))}
          </select>
        </div>
      </div>
      <div className="timetable-period-settings">
        {draft.periods.slice(0, draft.periodCount).map((period, index) => (
          <fieldset className="timetable-period-setting" key={index}>
            <legend>{index + 1}限</legend>
            <div className="course-schedule-fields">
              {(['startTime', 'endTime'] as const).map((field) => (
                <div className="form-field" key={field}>
                  <label className="input-label" htmlFor={`period-${index}-${field}`}>
                    {field === 'startTime' ? '開始時刻' : '終了時刻'}
                  </label>
                  <input id={`period-${index}-${field}`} className="entry-input" type="time"
                    value={period[field]} onChange={(event) => {
                      setDraft({ ...draft, periods: draft.periods.map((item, i) =>
                        i === index ? { ...item, [field]: event.target.value } : item) })
                      setMessage('')
                    }} />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="supporting-text">
        時限同士は重ならない順に設定してください。終了と次の開始が同時刻でも保存できます。
      </p>
      {error && <p className="weekly-editor-error" role="alert">{error}</p>}
      <button className="primary-button" type="button" onClick={save}>設定を保存する</button>
      {message && <p className="supporting-text" role="status">{message}</p>}
    </section>
  )
}

export default TimetableSettings
