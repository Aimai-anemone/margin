import { useState, type CSSProperties } from 'react'
import { getLocalDate } from './LoosePlanStorage'
import { type DailyRecord } from './DailyRecordStorage'
import {
  formatRecordMinutes,
  formatRecordPeriod,
  summarizeDailyRecords,
  type RecordPeriod,
} from './DailyRecordSummary'

type Props = {
  records: DailyRecord[]
  period: RecordPeriod
  onPeriodChange: (period: RecordPeriod) => void
}

const periods = [
  { value: 'day', label: '1日' },
  { value: 'week', label: '1週間' },
  { value: 'all', label: '全期間' },
] as const

function RecordSummary({ records, period, onPeriodChange }: Props) {
  const [today, setToday] = useState(getLocalDate)
  const summary = summarizeDailyRecords(records, period, today)
  const breakdownTotal = summary.breakdownScreenTimeMinutes
  const canDrawChart = breakdownTotal !== null && breakdownTotal > 0
  const totalText = formatRecordMinutes(breakdownTotal)
  const intendedShare = canDrawChart && summary.intendedMinutes !== null
    ? summary.intendedMinutes / breakdownTotal * 100 : 0

  return (
    <section className="record-summary" aria-label="期間別の記録集計">
      <div className="record-summary-periods" role="group" aria-label="集計する期間">
        {periods.map((option) => (
          <button className={`record-summary-period${period === option.value ? ' selected' : ''}`}
            type="button" key={option.value} aria-pressed={period === option.value}
            aria-controls="record-period-summary" onClick={() => {
              setToday(getLocalDate())
              onPeriodChange(option.value)
            }}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="card record-summary-card" id="record-period-summary" role="region" aria-label="選択期間の要約">
        <div className="record-summary-heading">
          <h2 className="closing-title">{formatRecordPeriod(period, summary.range, today)}</h2>
          <p className="record-summary-note">記録した日数：{summary.recordCount}日</p>
        </div>
        {summary.recordCount === 0 && period !== 'all' && (
          <p className="supporting-text">{period === 'day' ? '今日の記録はまだありません。' : 'この期間の記録はまだありません。'}</p>
        )}

        <dl className="record-summary-metrics">
          <div>
            <dt>スクリーンタイム合計</dt>
            <dd>{formatRecordMinutes(summary.screenTimeTotalMinutes)}</dd>
          </div>
          <div>
            <dt>1日平均 <span className="record-summary-note">（{summary.screenTimeDays}日分）</span></dt>
            <dd>{formatRecordMinutes(summary.screenTimeAverageMinutes)}</dd>
          </div>
        </dl>

        <div className="record-summary-breakdown">
          <h3 className="record-summary-subtitle">使用時間の内訳</h3>
          {summary.breakdownDays === 0 ? (
            <>
              <p className="record-summary-note">内訳を記録した日：0日</p>
              <p className="supporting-text">スクリーンタイムと意図せず使った時間を記録すると、ここに内訳が表示されます。</p>
            </>
          ) : (
            <>
              <p className="record-summary-note">{summary.breakdownDays === 1
                ? '両方の時間を記録した1日分の内訳です。'
                : `両方の時間を記録した${summary.breakdownDays}日分を集計`}</p>
              {canDrawChart ? (
                <figure className="record-summary-chart">
                  <div className="record-summary-donut" role="img"
                    aria-label={`使用時間の内訳。合計${totalText}。意図して使った時間${formatRecordMinutes(summary.intendedMinutes)}、${summary.intendedPercentage}%。意図せず使った時間${formatRecordMinutes(summary.unintendedMinutes)}、${summary.unintendedPercentage}%。`}
                    style={{ '--record-intended-share': `${intendedShare}%` } as CSSProperties}>
                    <div className="record-summary-donut-center" aria-hidden="true">
                      <span>合計</span>
                      <span className={`record-summary-donut-total${totalText.length > 8 ? ' long' : ''}`}>{totalText}</span>
                    </div>
                  </div>
                  <figcaption className="record-summary-legend">
                    <div className="record-summary-legend-item">
                      <span className="record-summary-swatch intended" aria-hidden="true" />
                      <span>意図して使った時間</span>
                      <span className="record-summary-legend-value">{formatRecordMinutes(summary.intendedMinutes)}・{summary.intendedPercentage}%</span>
                    </div>
                    <div className="record-summary-legend-item">
                      <span className="record-summary-swatch unintended" aria-hidden="true" />
                      <span>意図せず使った時間</span>
                      <span className="record-summary-legend-value">{formatRecordMinutes(summary.unintendedMinutes)}・{summary.unintendedPercentage}%</span>
                    </div>
                  </figcaption>
                </figure>
              ) : (
                <div className="record-summary-zero">
                  <p>合計：0分</p>
                  <p className="record-summary-note">意図せず使った時間：{formatRecordMinutes(summary.unintendedMinutes)}</p>
                  <p className="supporting-text">使用時間が0分のため、内訳はありません。</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="record-summary-plans">
          <h3 className="record-summary-subtitle">ゆるい予定</h3>
          {summary.totalPlans === 0 ? (
            <p className="supporting-text">この期間に記録されたゆるい予定はありません。</p>
          ) : (
            <p className="record-summary-plan-result">
              <span>{summary.totalPlans}件中{summary.completedPlans}件を完了</span>
              <span>達成率 {summary.completionPercentage}%</span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default RecordSummary
