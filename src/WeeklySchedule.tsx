import { useState } from 'react'
import LoosePlanPanel from './LoosePlans'
import { type LoosePlan } from './LoosePlanStorage'

const WEEKLY_SCHEDULES_STORAGE_KEY = 'margin-weekly-schedules'
const HOUR_HEIGHT = 72
const hours = Array.from({ length: 25 }, (_, hour) => hour)

const weekdays = [
  '日曜日',
  '月曜日',
  '火曜日',
  '水曜日',
  '木曜日',
  '金曜日',
  '土曜日',
] as const

type Weekday = (typeof weekdays)[number]

const scheduleColors = [
  { value: 'green', label: '緑' },
  { value: 'red', label: '赤' },
  { value: 'blue', label: '青' },
  { value: 'amber', label: '琥珀' },
  { value: 'purple', label: '紫' },
] as const

type ScheduleColor = (typeof scheduleColors)[number]['value']

type TimedSchedule = {
  id: string
  title: string
  weekday: Weekday
  startTime: string
  endTime: string
  memo: string
  color: ScheduleColor
}

type ScheduleDraft = Omit<TimedSchedule, 'id'>

type WeeklyScheduleProps = {
  loosePlans: LoosePlan[]
  todayDate: string
  tomorrowDate: string
  onSaveLoosePlan: (plan: LoosePlan) => void
  onDeleteLoosePlan: (planId: string) => void
  onToggleLoosePlanComplete: (planId: string) => void
}

function getWeekdayForDate(dateText: string): Weekday {
  const [yearText, monthText, dayText] = dateText.split('-')
  const date = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  )

  return weekdays[date.getDay()]
}

const emptySchedule: ScheduleDraft = {
  title: '',
  weekday: '月曜日',
  startTime: '09:00',
  endTime: '10:00',
  memo: '',
  color: 'green',
}

function isScheduleColor(value: unknown): value is ScheduleColor {
  return scheduleColors.some((color) => color.value === value)
}

function isTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
  )
}

function parseTimedSchedule(
  value: unknown,
): TimedSchedule | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null
  }

  const schedule = value as Record<string, unknown>

  if (
    typeof schedule.id !== 'string' ||
    typeof schedule.title !== 'string' ||
    !weekdays.includes(schedule.weekday as Weekday) ||
    !isTime(schedule.startTime) ||
    !isTime(schedule.endTime)
  ) {
    return null
  }

  return {
    id: schedule.id,
    title: schedule.title,
    weekday: schedule.weekday as Weekday,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    memo: typeof schedule.memo === 'string' ? schedule.memo : '',
    color: isScheduleColor(schedule.color)
      ? schedule.color
      : 'green',
  }
}

function loadSchedules(): TimedSchedule[] {
  const savedSchedules = localStorage.getItem(
    WEEKLY_SCHEDULES_STORAGE_KEY,
  )

  if (savedSchedules === null) {
    return []
  }

  try {
    const parsedSchedules: unknown = JSON.parse(savedSchedules)

    if (!Array.isArray(parsedSchedules)) {
      return []
    }

    return parsedSchedules
      .map(parseTimedSchedule)
      .filter((schedule): schedule is TimedSchedule => schedule !== null)
  } catch {
    return []
  }
}

function sortSchedules(schedules: TimedSchedule[]) {
  return [...schedules].sort((firstSchedule, secondSchedule) =>
    firstSchedule.startTime.localeCompare(
      secondSchedule.startTime,
    ),
  )
}

function timeToMinutes(time: string) {
  const [hourText, minuteText] = time.split(':')

  return Number(hourText) * 60 + Number(minuteText)
}

type SchedulePosition = {
  schedule: TimedSchedule
  column: number
  columnCount: number
}

function positionOverlappingSchedules(
  schedules: TimedSchedule[],
): SchedulePosition[] {
  const positionedSchedules: SchedulePosition[] = []
  let overlapGroup: TimedSchedule[] = []
  let overlapGroupEnd = 0

  function addOverlapGroup() {
    const columnEndTimes: number[] = []
    const groupPositions = overlapGroup.map((schedule) => {
      const startTime = timeToMinutes(schedule.startTime)
      const endTime = timeToMinutes(schedule.endTime)
      const availableColumn = columnEndTimes.findIndex(
        (columnEndTime) => columnEndTime <= startTime,
      )
      const column =
        availableColumn === -1
          ? columnEndTimes.length
          : availableColumn

      columnEndTimes[column] = endTime

      return {
        schedule,
        column,
        columnCount: 0,
      }
    })

    positionedSchedules.push(
      ...groupPositions.map((position) => ({
        ...position,
        columnCount: columnEndTimes.length,
      })),
    )
  }

  schedules.forEach((schedule) => {
    const startTime = timeToMinutes(schedule.startTime)
    const endTime = timeToMinutes(schedule.endTime)

    if (
      overlapGroup.length > 0 &&
      startTime >= overlapGroupEnd
    ) {
      addOverlapGroup()
      overlapGroup = []
    }

    overlapGroup.push(schedule)
    overlapGroupEnd = Math.max(overlapGroupEnd, endTime)
  })

  if (overlapGroup.length > 0) {
    addOverlapGroup()
  }

  return positionedSchedules
}

function WeeklySchedule({
  loosePlans,
  todayDate,
  tomorrowDate,
  onSaveLoosePlan,
  onDeleteLoosePlan,
  onToggleLoosePlanComplete,
}: WeeklyScheduleProps) {
  const [schedules, setSchedules] = useState<TimedSchedule[]>(
    loadSchedules,
  )
  const [selectedWeekday, setSelectedWeekday] =
    useState<Weekday>('月曜日')
  const [scheduleDraft, setScheduleDraft] =
    useState<ScheduleDraft>(emptySchedule)
  const [isShowingEditor, setIsShowingEditor] =
    useState(false)
  const [editingScheduleId, setEditingScheduleId] =
    useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState('')

  const selectedSchedules = sortSchedules(
    schedules.filter(
      (schedule) => schedule.weekday === selectedWeekday,
    ),
  )
  const positionedSchedules = positionOverlappingSchedules(
    selectedSchedules,
  )
  const todayWeekday = getWeekdayForDate(todayDate)
  const tomorrowWeekday = getWeekdayForDate(tomorrowDate)
  const loosePlanPanel =
    selectedWeekday === todayWeekday
      ? { date: todayDate, heading: '今日の予定' }
      : selectedWeekday === tomorrowWeekday
        ? { date: tomorrowDate, heading: '明日の予定' }
        : null

  function saveSchedules(nextSchedules: TimedSchedule[]) {
    const sortedSchedules = sortSchedules(nextSchedules)

    setSchedules(sortedSchedules)
    localStorage.setItem(
      WEEKLY_SCHEDULES_STORAGE_KEY,
      JSON.stringify(sortedSchedules),
    )
  }

  function updateScheduleDraft(
    field: keyof ScheduleDraft,
    value: string,
  ) {
    setScheduleDraft((currentSchedule) => ({
      ...currentSchedule,
      [field]: value,
    }))
  }

  function startAddingSchedule() {
    setScheduleDraft({
      ...emptySchedule,
      weekday: selectedWeekday,
    })
    setEditingScheduleId(null)
    setScheduleError('')
    setIsShowingEditor(true)
  }

  function startEditingSchedule(schedule: TimedSchedule) {
    setScheduleDraft({
      title: schedule.title,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      memo: schedule.memo,
      color: schedule.color,
    })
    setEditingScheduleId(schedule.id)
    setScheduleError('')
    setIsShowingEditor(true)
  }

  function cancelEditingSchedule() {
    setScheduleDraft(emptySchedule)
    setEditingScheduleId(null)
    setScheduleError('')
    setIsShowingEditor(false)
  }

  function saveSchedule() {
    const cleanedTitle = scheduleDraft.title.trim()

    if (cleanedTitle === '') {
      setScheduleError('予定名を入力してください。')
      return
    }

    if (
      timeToMinutes(scheduleDraft.startTime) >=
      timeToMinutes(scheduleDraft.endTime)
    ) {
      setScheduleError('終了時刻は開始時刻より後にしてください。')
      return
    }

    const nextSchedule: TimedSchedule = {
      id: editingScheduleId ?? crypto.randomUUID(),
      title: cleanedTitle,
      weekday: scheduleDraft.weekday,
      startTime: scheduleDraft.startTime,
      endTime: scheduleDraft.endTime,
      memo: scheduleDraft.memo,
      color: scheduleDraft.color,
    }

    const nextSchedules =
      editingScheduleId === null
        ? [...schedules, nextSchedule]
        : schedules.map((schedule) =>
            schedule.id === editingScheduleId
              ? nextSchedule
              : schedule,
          )

    saveSchedules(nextSchedules)
    setSelectedWeekday(nextSchedule.weekday)
    cancelEditingSchedule()
  }

  function deleteSchedule() {
    if (editingScheduleId === null) {
      return
    }

    const shouldDelete = window.confirm(
      'この週間予定を削除しますか？',
    )

    if (!shouldDelete) {
      return
    }

    saveSchedules(
      schedules.filter(
        (schedule) => schedule.id !== editingScheduleId,
      ),
    )
    cancelEditingSchedule()
  }

  return (
    <section className="card weekly-schedule">
      <div className="weekly-schedule-intro">
        <div className="card-heading">
          <div>
            <p className="section-label">毎週の予定</p>
            <h2 className="card-title">週間</h2>
          </div>

          <span className="badge">{selectedSchedules.length}件</span>
        </div>

        <p className="supporting-text">
          曜日ごとの予定を、時間の流れに沿って見渡せます。
        </p>
      </div>

      <div
        className="weekday-picker"
        role="group"
        aria-label="表示する曜日を選ぶ"
      >
        {weekdays.map((weekday) => (
          <button
            key={weekday}
            className={`weekday-button ${
              selectedWeekday === weekday ? 'active' : ''
            }`}
            type="button"
            aria-pressed={selectedWeekday === weekday}
            onClick={() => setSelectedWeekday(weekday)}
          >
            {weekday.slice(0, 1)}
          </button>
        ))}
      </div>

      {loosePlanPanel && (
        <LoosePlanPanel
          key={loosePlanPanel.date}
          plans={loosePlans}
          date={loosePlanPanel.date}
          heading={loosePlanPanel.heading}
          collapsible
          stickyHeading
          onSave={onSaveLoosePlan}
          onDelete={onDeleteLoosePlan}
          onToggleComplete={onToggleLoosePlanComplete}
        />
      )}

      <button
        className="secondary-button weekly-add-button"
        type="button"
        onClick={startAddingSchedule}
      >
        予定を追加する
      </button>

      {isShowingEditor && (
        <div className="weekly-editor">
          <p className="section-label">
            {editingScheduleId === null
              ? '予定を追加'
              : '予定を編集'}
          </p>

          <div className="form-field">
            <label className="input-label" htmlFor="schedule-title">
              予定名
            </label>
            <input
              id="schedule-title"
              className="entry-input"
              type="text"
              value={scheduleDraft.title}
              onChange={(event) =>
                updateScheduleDraft('title', event.target.value)
              }
              placeholder="例：英語の授業"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="schedule-weekday">
              曜日
            </label>
            <select
              id="schedule-weekday"
              className="entry-input"
              value={scheduleDraft.weekday}
              onChange={(event) =>
                updateScheduleDraft('weekday', event.target.value)
              }
            >
              {weekdays.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {weekday}
                </option>
              ))}
            </select>
          </div>

          <div className="schedule-time-fields">
            <div className="form-field">
              <label className="input-label" htmlFor="schedule-start">
                開始時刻
              </label>
              <input
                id="schedule-start"
                className="entry-input"
                type="time"
                step="900"
                value={scheduleDraft.startTime}
                onChange={(event) =>
                  updateScheduleDraft(
                    'startTime',
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="form-field">
              <label className="input-label" htmlFor="schedule-end">
                終了時刻
              </label>
              <input
                id="schedule-end"
                className="entry-input"
                type="time"
                step="900"
                value={scheduleDraft.endTime}
                onChange={(event) =>
                  updateScheduleDraft('endTime', event.target.value)
                }
              />
            </div>
          </div>

          <div
            className="schedule-color-field"
            role="group"
            aria-labelledby="schedule-color-label"
          >
            <span
              id="schedule-color-label"
              className="input-label schedule-color-label"
            >
              色
            </span>
            <div
              className="schedule-color-options"
            >
              {scheduleColors.map((color) => {
                const isSelected = scheduleDraft.color === color.value

                return (
                  <button
                    key={color.value}
                    className={`schedule-color-swatch schedule-color-swatch-${color.value} ${
                      isSelected ? 'selected' : ''
                    }`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`予定の色：${color.label}${
                      isSelected ? '（選択中）' : ''
                    }`}
                    onClick={() =>
                      updateScheduleDraft('color', color.value)
                    }
                  >
                    <span aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="schedule-color-selected">
              選択中：
              {
                scheduleColors.find(
                  (color) => color.value === scheduleDraft.color,
                )?.label
              }
            </p>
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="schedule-memo">
              メモ（任意）
            </label>
            <textarea
              id="schedule-memo"
              className="entry-input schedule-memo-input"
              value={scheduleDraft.memo}
              onChange={(event) =>
                updateScheduleDraft('memo', event.target.value)
              }
              placeholder="例：教室と持ち物を確認する"
              rows={4}
            />
          </div>

          {scheduleError !== '' && (
            <p className="weekly-editor-error">{scheduleError}</p>
          )}

          <div className="editor-actions">
            <button
              className="primary-button"
              type="button"
              onClick={saveSchedule}
            >
              保存する
            </button>
            <button
              className="cancel-button"
              type="button"
              onClick={cancelEditingSchedule}
            >
              やめる
            </button>
          </div>

          {editingScheduleId !== null && (
            <button
              className="delete-task-button weekly-delete-button"
              type="button"
              onClick={deleteSchedule}
            >
              予定を削除する
            </button>
          )}
        </div>
      )}

      <div className="weekly-calendar" aria-label={`${selectedWeekday}の予定`}>
        <div className="weekly-time-labels" aria-hidden="true">
          {hours.map((hour) => (
            <span
              key={hour}
              className="weekly-time-label"
              style={{ top: `${hour * HOUR_HEIGHT}px` }}
            >
              {`${hour}`.padStart(2, '0')}:00
            </span>
          ))}
        </div>

        <div className="weekly-time-grid">
          {hours.map((hour) => (
            <div
              key={hour}
              className="weekly-time-line"
              style={{ top: `${hour * HOUR_HEIGHT}px` }}
            />
          ))}

          {positionedSchedules.map((position) => {
            const { schedule } = position
            const startMinutes = timeToMinutes(schedule.startTime)
            const durationMinutes =
              timeToMinutes(schedule.endTime) - startMinutes

            return (
              <button
                key={schedule.id}
                className={`weekly-schedule-block weekly-schedule-block-${schedule.color}`}
                type="button"
                style={{
                  top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
                  height: `${Math.max(
                    (durationMinutes / 60) * HOUR_HEIGHT,
                    44,
                  )}px`,
                  left: `calc(${(position.column / position.columnCount) * 100}% + 4px)`,
                  width: `calc(${100 / position.columnCount}% - 8px)`,
                }}
                aria-label={`${schedule.title}、${schedule.startTime}から${schedule.endTime}。編集する`}
                onClick={() => startEditingSchedule(schedule)}
              >
                <strong>{schedule.title}</strong>
                <span>
                  {schedule.startTime}〜{schedule.endTime}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default WeeklySchedule
