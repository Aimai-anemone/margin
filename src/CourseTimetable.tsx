import { Fragment, useRef, useState } from 'react'
import { type Course } from './CourseStorage'
import { courseWeekdays, getYearOptions, terms, type Term, type TimetableSettings } from './TimetableStorage'

type CourseTimetableProps = {
  courses: Course[]
  settings: TimetableSettings
  onSettingsChange: (settings: TimetableSettings) => void
  onAddTask: (courseId: string) => void
  onAddCourse: (weekday: string, period: string) => void
  onEditCourse: (courseId: string) => void
  onDeleteCourse: (courseId: string) => void
}

function CourseTimetable({
  courses,
  settings,
  onSettingsChange,
  onAddTask,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
}: CourseTimetableProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    null,
  )
  const [selectionError, setSelectionError] = useState('')
  const detailRef = useRef<HTMLDivElement>(null)

  function showCourse(courseId: string) {
    setSelectedCourseId(courseId)
    requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true })
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const weekdays = courseWeekdays
    .slice(0, settings.dayMode === 'weekdays' ? 5 : settings.dayMode === 'saturday' ? 6 : 7)
    .map((value) => ({ value, label: value.slice(0, 1) }))
  const periods = settings.periods.slice(0, settings.periodCount)
    .map((time, index) => ({ ...time, label: `${index + 1}限` }))
  const termCourses = courses.filter((course) =>
    course.academicYear === settings.academicYear && course.term === settings.term)
  const selectedCourse =
    termCourses.find((course) => course.id === selectedCourseId) ?? null
  const selectedPeriodTime = selectedCourse && /^\d+限$/.test(selectedCourse.period)
    ? settings.periods[Number.parseInt(selectedCourse.period, 10) - 1]
    : undefined
  const placedCourses = termCourses.filter(
    (course) =>
      weekdays.some((weekday) => weekday.value === course.weekday) &&
      periods.some((period) => period.label === course.period),
  )
  const unplacedCourses = termCourses.filter(
    (course) => !placedCourses.includes(course),
  )

  function coursesForCell(weekday: string, period: string) {
    return placedCourses.filter(
      (course) =>
        course.weekday === weekday && course.period === period,
    )
  }

  function selectTerm(academicYear: number, term: Term) {
    try {
      onSettingsChange({ ...settings, academicYear, term })
      setSelectedCourseId(null)
      setSelectionError('')
    } catch {
      setSelectionError('年度・学期を保存できませんでした。ブラウザーの保存設定を確認してください。')
    }
  }

  return (
    <section className="card course-timetable">
      <div className="card-heading">
        <div>
          <p className="section-label">授業の見通し</p>
          <h2 className="card-title">大学の時間割</h2>
        </div>
        <span className="badge">{termCourses.length}件</span>
      </div>

      <p className="supporting-text">
        空きコマを押すと授業を登録できます。授業を選ぶと、詳細を確認できます。
      </p>

      <div className="course-schedule-fields course-timetable-selection">
        <div className="form-field">
          <label className="input-label" htmlFor="timetable-year">年度</label>
          <select id="timetable-year" className="entry-input" value={settings.academicYear}
            onChange={(event) => selectTerm(Number(event.target.value), settings.term)}>
            {getYearOptions(settings.academicYear, ...courses.map((course) => course.academicYear)).map((year) => (
              <option key={year} value={year}>{year}年度</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="input-label" htmlFor="timetable-term">学期</label>
          <select id="timetable-term" className="entry-input" value={settings.term}
            onChange={(event) => selectTerm(settings.academicYear, Number(event.target.value) as Term)}>
            {terms.map((term) => <option key={term} value={term}>{term}学期</option>)}
          </select>
        </div>
      </div>
      {selectionError && <p className="weekly-editor-error" role="alert">{selectionError}</p>}

      <div className={`course-timetable-scroll ${settings.dayMode === 'weekdays' ? 'course-timetable-weekdays-only' : 'course-timetable-with-weekend'}`}>
        <div
          className="course-timetable-grid"
          role="table"
          aria-label={`${settings.academicYear}年度 ${settings.term}学期の時間割`}
          style={{
            gridTemplateColumns: `36px repeat(${weekdays.length}, minmax(0, 1fr))`,
            gridTemplateRows: `42px repeat(${periods.length}, 90px)`,
            minWidth: settings.dayMode === 'weekdays' ? 0 : `${36 + weekdays.length * 76}px`,
          }}
        >
          <div role="row" className="course-timetable-grid-row">
          <div className="course-timetable-corner" role="columnheader">
            時限
          </div>
          {weekdays.map((weekday) => (
            <div
              key={weekday.value}
              className="course-timetable-weekday"
              role="columnheader"
            >
              {weekday.label}
            </div>
          ))}
          </div>

          {periods.map((period) => (
            <Fragment key={period.label}>
              <div role="row" className="course-timetable-grid-row">
              <div
                className="course-timetable-period"
                role="rowheader"
              >
                <strong>{period.label}</strong>
                <span>{period.startTime}</span>
                <span>{period.endTime}</span>
              </div>
              {weekdays.map((weekday) => {
                const cellCourses = coursesForCell(
                  weekday.value,
                  period.label,
                )

                return (
                  <div
                    key={`${weekday.value}-${period.label}`}
                    className={`course-timetable-cell ${cellCourses.length === 0 ? 'course-timetable-cell-empty' : ''} ${cellCourses.length > 1 ? 'course-timetable-cell-multiple' : ''}`}
                    role="cell"
                    aria-label={`${weekday.label}曜日 ${period.label}${cellCourses.length === 0 ? '、空きコマ' : ''}`}
                  >
                    {cellCourses.length === 0 && (
                      <button className="course-timetable-empty-button" type="button"
                        aria-label={`${settings.academicYear}年度 ${settings.term}学期 ${weekday.value} ${period.label}に授業を追加`}
                        onClick={() => onAddCourse(weekday.value, period.label)} />
                    )}
                    {cellCourses.map((course) => (
                      <button
                        key={course.id}
                        className="course-timetable-course"
                        type="button"
                        aria-label={`${course.name}、${course.weekday}${course.period}。詳細を表示`}
                        aria-expanded={selectedCourseId === course.id}
                        aria-controls="course-timetable-detail"
                        onClick={() => showCourse(course.id)}
                      >
                        <span className="course-timetable-course-name">{course.name}</span>
                        {course.classroom && <span className="course-timetable-classroom">{course.classroom}</span>}
                      </button>
                    ))}
                  </div>
                )
              })}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {unplacedCourses.length > 0 && (
        <div className="course-timetable-unplaced">
          <p className="section-label">未配置の授業</p>
          <p className="supporting-text">
            この年度・学期のうち、表示対象外の曜日・時限や未設定の授業です。データは残っています。
          </p>
          <div className="course-timetable-unplaced-list">
            {unplacedCourses.map((course) => (
              <button
                key={course.id}
                className="course-timetable-unplaced-button"
                type="button"
                aria-expanded={selectedCourseId === course.id}
                aria-controls="course-timetable-detail"
                onClick={() => showCourse(course.id)}
              >
                <span>{course.name}</span>
                <span>
                  {course.weekday || '曜日未設定'}・
                  {course.period || '時限未設定'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCourse !== null && (
        <div id="course-timetable-detail" className="course-timetable-detail"
          ref={detailRef} tabIndex={-1} role="region" aria-labelledby="course-detail-name">
          <div className="course-timetable-detail-heading">
            <div>
              <p className="section-label">授業の詳細</p>
              <h3 id="course-detail-name">{selectedCourse.name}</h3>
            </div>
            <button
              className="detail-close-button"
              type="button"
              onClick={() => setSelectedCourseId(null)}
            >
              閉じる
            </button>
          </div>

          <p className="course-timetable-detail-meta">
            <span>{selectedCourse.academicYear}年度・{selectedCourse.term}学期</span>
            <span>
              {selectedCourse.weekday || '曜日未設定'}・{selectedCourse.period || '時限未設定'}
              {selectedPeriodTime && ` · ${selectedPeriodTime.startTime}〜${selectedPeriodTime.endTime}`}
            </span>
          </p>

          {selectedCourse.classroom && (
            <div className="course-timetable-detail-row"><span>教室</span><strong>{selectedCourse.classroom}</strong></div>
          )}
          {selectedCourse.teacher && (
            <div className="course-timetable-detail-row"><span>教員</span><strong>{selectedCourse.teacher}</strong></div>
          )}

          {selectedCourse.defaultFormat !== '' && (
            <div className="course-timetable-detail-row">
              <span>標準の課題形式</span>
              <strong>{selectedCourse.defaultFormat}</strong>
            </div>
          )}

          {selectedCourse.defaultFirstStep !== '' && (
            <div className="course-timetable-detail-step">
              <p className="section-label">標準の最初の入口</p>
              <p>{selectedCourse.defaultFirstStep}</p>
            </div>
          )}

          <div className="course-timetable-detail-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onAddTask(selectedCourse.id)}
            >
              この授業の課題を追加
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onEditCourse(selectedCourse.id)}
            >
              編集する
            </button>
            <button className="delete-task-button" type="button"
              onClick={() => onDeleteCourse(selectedCourse.id)}>
              授業を削除する
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default CourseTimetable
