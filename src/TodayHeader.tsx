import { useState } from 'react'
import type { DailyRecord } from './DailyRecordStorage'
import { sceneryIndex, selectMemory } from './TodayAtmosphere'

// Vite discovers only the supplied, processed images; sorted names are stable.
const scenery = Object.keys(import.meta.glob('/public/scenery/*.webp'))
  .sort().map((path) => `${import.meta.env.BASE_URL}${path.slice('/public/'.length)}`)

function SceneryStrip({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="today-scenery" aria-hidden="true">
    {!failed && <img src={src} alt="" width="1074" height="192" onError={() => setFailed(true)} />}
  </div>
}

export default function TodayHeader({ date, records, loadError, onOpenRecord }: {
  date: string
  records: DailyRecord[]
  loadError: string
  onOpenRecord: (date: string) => void
}) {
  const memory = loadError ? null : selectMemory(records, date)
  return <div className="today-editorial-header">
    <p className="today-kicker">今日</p>
    <p className="today-date">{new Intl.DateTimeFormat('ja-JP', {
      month: 'long', day: 'numeric', weekday: 'long',
    }).format(new Date(`${date}T12:00:00`))}</p>
    <p className="app-name">Margin</p>
    {scenery.length >= 3 && <SceneryStrip key={date} src={scenery[sceneryIndex(date, scenery.length)]} />}
    {memory && <button className="today-memory" type="button"
      onClick={() => onOpenRecord(memory.record.date)}>
      <span className="today-memory-label">{memory.reason} · <time dateTime={memory.record.date}>{memory.record.date.replaceAll('-', '/')}</time></span>
      <span className="today-memory-text">{memory.record.insight}</span>
    </button>}
  </div>
}
