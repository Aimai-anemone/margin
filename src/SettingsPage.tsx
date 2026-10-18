import { useState } from 'react'
import DataBackup from './DataBackup'
import TimetableSettings from './TimetableSettings'
import { type TimetableSettings as Settings } from './TimetableStorage'

type Props = {
  timetableSettings: Settings
  onSaveTimetableSettings: (settings: Settings) => void
}

function SettingsPage({ timetableSettings, onSaveTimetableSettings }: Props) {
  const [weeklyStartError, setWeeklyStartError] = useState('')

  function changeWeeklyStartHour(hour: number) {
    try {
      onSaveTimetableSettings({ ...timetableSettings, weeklyStartHour: hour })
      setWeeklyStartError('')
    } catch {
      setWeeklyStartError('開始時刻を保存できませんでした。端末の保存設定を確認してください。')
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-page-heading">
        <p className="section-label">設定</p>
        <h1 className="card-title">設定</h1>
      </div>

      <TimetableSettings settings={timetableSettings} onSave={onSaveTimetableSettings} />

      <section className="card weekly-start-settings">
        <h2 className="card-title">週間予定</h2>
        <div className="form-field weekly-start-field">
          <label className="input-label" htmlFor="weekly-start-hour">週間予定の開始時刻</label>
          <select id="weekly-start-hour" className="entry-input"
            value={timetableSettings.weeklyStartHour ?? 0}
            onChange={(event) => changeWeeklyStartHour(Number(event.target.value))}>
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>{hour}:00</option>
            ))}
          </select>
        </div>
        <p className="supporting-text">選んだ時刻から24時間分を表示します。</p>
        {weeklyStartError && <p className="weekly-editor-error" role="alert">{weeklyStartError}</p>}
      </section>

      <DataBackup />

      <section className="card settings-about">
        <p className="section-label">アプリについて</p>
        <h2 className="card-title">Margin</h2>
        <p className="supporting-text">
          個人用の課題・週間管理PWAです。ホーム画面から起動でき、オフラインでも利用できます。記録は端末ごとに保存され、別の端末へ自動同期されません。
        </p>
      </section>
    </div>
  )
}

export default SettingsPage
