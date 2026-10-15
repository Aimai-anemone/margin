import DataBackup from './DataBackup'
import TimetableSettings from './TimetableSettings'
import { type TimetableSettings as Settings } from './TimetableStorage'

type Props = {
  timetableSettings: Settings
  onSaveTimetableSettings: (settings: Settings) => void
}

function SettingsPage({ timetableSettings, onSaveTimetableSettings }: Props) {
  return (
    <div className="settings-page">
      <div className="settings-page-heading">
        <p className="section-label">設定</p>
        <h1 className="card-title">設定</h1>
      </div>

      <TimetableSettings settings={timetableSettings} onSave={onSaveTimetableSettings} />

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
