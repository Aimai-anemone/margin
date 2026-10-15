import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { isCoursePeriod, isCourseWeekday, type Course } from './CourseStorage'
import { getAcademicYear, getYearOptions, isAcademicYear, isTerm, terms, type Term } from './TimetableStorage'

type CourseDraft = Omit<Course, 'id'>
export type CoursePlacement = Pick<Course, 'weekday' | 'period' | 'academicYear' | 'term'>

const emptyCourse: CourseDraft = {
  name: '',
  weekday: '月曜日',
  period: '1限',
  defaultFormat: '学校のWebシステム',
  defaultFirstStep: '',
  classroom: '',
  teacher: '',
  academicYear: getAcademicYear(),
  term: 1,
}

type CourseTemplatesProps = {
  courses: Course[]
  onSaveCourses: (nextCourses: Course[]) => void
  academicYear: number
  term: Term
  showList?: boolean
}

export type CourseTemplatesHandle = {
  startAddingCourse: (placement: CoursePlacement) => boolean
  startEditingCourse: (course: Course) => boolean
  deleteCourse: (course: Course) => boolean
}

const CourseTemplates = forwardRef<
  CourseTemplatesHandle,
  CourseTemplatesProps
>(function CourseTemplates({ courses, onSaveCourses, academicYear, term, showList = true }, ref) {

  const [courseDraft, setCourseDraft] =
    useState<CourseDraft>(emptyCourse)

  const [isAddingCourse, setIsAddingCourse] =
    useState(false)
  const [courseError, setCourseError] = useState('')
    const [editingCourseId, setEditingCourseId] =
  useState<string | null>(null)
  const initialDraftRef = useRef<CourseDraft>(emptyCourse)
  const courseEditorRef = useRef<HTMLDivElement>(null)
  const courseNameRef = useRef<HTMLInputElement>(null)

  function showCourseEditor() {
    requestAnimationFrame(() => {
      courseNameRef.current?.focus({ preventScroll: true })
      courseEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function canReplaceDraft() {
    return !isAddingCourse ||
      JSON.stringify(courseDraft) === JSON.stringify(initialDraftRef.current) ||
      window.confirm('入力中の授業の変更を破棄して、別の授業フォームを開きますか？')
  }

  function startAddingCourse(placement: CoursePlacement) {
    if (!canReplaceDraft()) return false
    const nextDraft = { ...emptyCourse, ...placement }
    initialDraftRef.current = nextDraft
    setCourseDraft(nextDraft)
    setCourseError('')
    setEditingCourseId(null)
    setIsAddingCourse(true)
    showCourseEditor()
    return true
  }

  function updateCourseDraft<Field extends keyof CourseDraft>(
    field: Field,
    value: CourseDraft[Field],
  ) {
    setCourseDraft((currentCourse) => ({
      ...currentCourse,
      [field]: value,
    }))
  }

  function saveCourses(nextCourses: Course[]) {
    try {
      onSaveCourses(nextCourses)
      return true
    } catch {
      setCourseError('授業を保存できませんでした。ブラウザーの保存設定を確認してください。')
      return false
    }
  }

  useImperativeHandle(ref, () => ({
    startAddingCourse,
    startEditingCourse,
    deleteCourse,
  }))
function startEditingCourse(course: Course) {
  if (isAddingCourse && editingCourseId === course.id) {
    showCourseEditor()
    return true
  }
  if (!canReplaceDraft()) return false
  setCourseError('')
  const nextDraft = {
    name: course.name,
    weekday: course.weekday,
    period: course.period,
    defaultFormat: course.defaultFormat,
    defaultFirstStep: course.defaultFirstStep,
    classroom: course.classroom,
    teacher: course.teacher,
    academicYear: course.academicYear,
    term: course.term,
  }
  initialDraftRef.current = nextDraft
  setCourseDraft(nextDraft)

  setEditingCourseId(course.id)
  setIsAddingCourse(true)
  showCourseEditor()
  return true
}

 function saveCourse() {
  const cleanedName = courseDraft.name.trim()

  if (cleanedName === '') {
    return
  }

  const existingCourse = courses.find((course) => course.id === editingCourseId)
  if (
    !isAcademicYear(courseDraft.academicYear) || !isTerm(courseDraft.term) ||
    (!isCourseWeekday(courseDraft.weekday) && courseDraft.weekday !== existingCourse?.weekday) ||
    (!isCoursePeriod(courseDraft.period) && courseDraft.period !== existingCourse?.period)
  ) {
    setCourseError('年度・学期・曜日・時限を確認してください。')
    return
  }

  const changedPlacement = !existingCourse ||
    existingCourse.academicYear !== courseDraft.academicYear ||
    existingCourse.term !== courseDraft.term ||
    existingCourse.weekday !== courseDraft.weekday ||
    existingCourse.period !== courseDraft.period
  const duplicates = courses.filter((course) =>
    course.id !== editingCourseId &&
    course.academicYear === courseDraft.academicYear &&
    course.term === courseDraft.term &&
    course.weekday === courseDraft.weekday && course.period === courseDraft.period,
  )
  if (changedPlacement && duplicates.length > 0 && !window.confirm(
    `同じ年度・学期・曜日・時限に「${duplicates.map((course) => course.name).join('」「')}」があります。既存の授業を残して、この授業も保存しますか？`,
  )) return

  if (editingCourseId !== null) {
    const updatedCourses = courses.map((course) => {
      if (course.id !== editingCourseId) {
        return course
      }

      return {
        ...course,
        legacyPlacement: isCourseWeekday(courseDraft.weekday) && isCoursePeriod(courseDraft.period)
          ? undefined
          : { weekday: courseDraft.weekday, period: courseDraft.period },
        name: cleanedName,
        classroom: courseDraft.classroom.trim(),
        teacher: courseDraft.teacher.trim(),
        academicYear: courseDraft.academicYear,
        term: courseDraft.term,
        weekday: courseDraft.weekday,
        period: courseDraft.period,
        defaultFormat: courseDraft.defaultFormat,
        defaultFirstStep:
          courseDraft.defaultFirstStep.trim(),
      }
    })

    if (!saveCourses(updatedCourses)) return
  } else {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      name: cleanedName,
      classroom: courseDraft.classroom.trim(),
      teacher: courseDraft.teacher.trim(),
      academicYear: courseDraft.academicYear,
      term: courseDraft.term,
      weekday: courseDraft.weekday,
      period: courseDraft.period,
      defaultFormat: courseDraft.defaultFormat,
      defaultFirstStep:
        courseDraft.defaultFirstStep.trim(),
    }

    if (!saveCourses([...courses, newCourse])) return
  }

  setCourseDraft(emptyCourse)
  setEditingCourseId(null)
  setIsAddingCourse(false)
}

  function cancelAddingCourse() {
    setCourseError('')
    setCourseDraft(emptyCourse)
    setEditingCourseId(null)
    setIsAddingCourse(false)
  }
function deleteCourse(course: Course) {
  const shouldDelete = window.confirm(
    `「${course.name}」を削除しますか？`,
  )

  if (!shouldDelete) {
    return false
  }

  const remainingCourses = courses.filter(
    (savedCourse) => savedCourse.id !== course.id,
  )

  if (!saveCourses(remainingCourses)) return false

  if (editingCourseId === course.id) {
    setCourseError('')
    setCourseDraft(emptyCourse)
    setEditingCourseId(null)
    setIsAddingCourse(false)
  }
  return true
}
  if (!showList && !isAddingCourse) return null

  return (
    <section className="card course-templates">
      {showList && (
        <>
      <div className="card-heading">
        <div>
          <p className="section-label">
            授業テンプレート
          </p>

          <h2 className="card-title">
            {courses.length === 0
              ? '登録された授業はありません'
              : `${courses.length}件の授業があります`}
          </h2>
        </div>

        <span className="badge">
          {courses.length}件
        </span>
      </div>

      {courses.length > 0 && (
        <div className="course-list">
          {courses.map((course) => (
            <div
              className="course-list-item"
              key={course.id}
            >
              <div>
                <h3>{course.name}</h3>

                <p>
                  {course.weekday}・{course.period}
                </p>
                <p>{course.academicYear}年度・{course.term}学期</p>
                {course.classroom && <p>{course.classroom}</p>}
              </div>

              <span>{course.defaultFormat}</span>
              <button
  className="secondary-button"
  type="button"
  onClick={() => startEditingCourse(course)}
>
  編集する
</button>
<button
  className="delete-task-button"
  type="button"
  onClick={() => deleteCourse(course)}
>
  削除する
</button>
            </div>
          ))}
        </div>
      )}

      {!isAddingCourse && (
        <>
          {courses.length === 0 && (
            <p className="supporting-text">
              一度登録すると、毎週の課題作成に
              再利用できます。
            </p>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => startAddingCourse({
              weekday: emptyCourse.weekday,
              period: emptyCourse.period,
              academicYear,
              term,
            })}

          >
            授業を追加
          </button>
        </>
      )}
        </>
      )}

      {isAddingCourse && (
        <div className="course-editor" ref={courseEditorRef}>
          <h2 className="section-label">{editingCourseId === null ? '授業を追加' : '授業を編集'}</h2>
          <div className="course-schedule-fields">
            <div className="form-field">
              <label className="input-label" htmlFor="course-year">年度</label>
              <select id="course-year" className="entry-input" value={courseDraft.academicYear}
                onChange={(event) => updateCourseDraft('academicYear', Number(event.target.value))}>
                {getYearOptions(courseDraft.academicYear, academicYear).map((year) => (
                  <option key={year} value={year}>{year}年度</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="input-label" htmlFor="course-term">学期</label>
              <select id="course-term" className="entry-input" value={courseDraft.term}
                onChange={(event) => updateCourseDraft('term', Number(event.target.value) as Term)}>
                {terms.map((value) => <option key={value} value={value}>{value}学期</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label
              className="input-label"
              htmlFor="course-name"
            >
              授業名
            </label>

            <input
              id="course-name"
              ref={courseNameRef}
              className="entry-input"
              type="text"
              value={courseDraft.name}
              onChange={(event) =>
                updateCourseDraft(
                  'name',
                  event.target.value,
                )
              }
              placeholder="例：心理学概論"
            />
          </div>

          <div className="course-schedule-fields">
            <div className="form-field">
              <label
                className="input-label"
                htmlFor="course-weekday"
              >
                曜日
              </label>

              <select
                id="course-weekday"
                className="entry-input"
                value={courseDraft.weekday}
                onChange={(event) =>
                  updateCourseDraft(
                    'weekday',
                    event.target.value,
                  )
                }
              >
                {!['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'].includes(courseDraft.weekday) && (
                  <option value={courseDraft.weekday}>{courseDraft.weekday || '未設定'}</option>
                )}
                <option value="月曜日">月曜日</option>
                <option value="火曜日">火曜日</option>
                <option value="水曜日">水曜日</option>
                <option value="木曜日">木曜日</option>
                <option value="金曜日">金曜日</option>
                <option value="土曜日">土曜日</option>
                <option value="日曜日">日曜日</option>
              </select>
            </div>

            <div className="form-field">
              <label
                className="input-label"
                htmlFor="course-period"
              >
                時限
              </label>

              <select
                id="course-period"
                className="entry-input"
                value={courseDraft.period}
                onChange={(event) =>
                  updateCourseDraft(
                    'period',
                    event.target.value,
                  )
                }
              >
                {!['1限', '2限', '3限', '4限', '5限', '6限', '7限', '8限', 'その他'].includes(courseDraft.period) && (
                  <option value={courseDraft.period}>{courseDraft.period || '未設定'}</option>
                )}
                <option value="1限">1限</option>
                <option value="2限">2限</option>
                <option value="3限">3限</option>
                <option value="4限">4限</option>
                <option value="5限">5限</option>
                <option value="6限">6限</option>
                <option value="7限">7限</option>
                <option value="8限">8限</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>

          <div className="course-schedule-fields">
            <div className="form-field">
              <label className="input-label" htmlFor="course-classroom">教室（任意）</label>
              <input id="course-classroom" className="entry-input" value={courseDraft.classroom}
                onChange={(event) => updateCourseDraft('classroom', event.target.value)} />
            </div>
            <div className="form-field">
              <label className="input-label" htmlFor="course-teacher">教員（任意）</label>
              <input id="course-teacher" className="entry-input" value={courseDraft.teacher}
                onChange={(event) => updateCourseDraft('teacher', event.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label
              className="input-label"
              htmlFor="course-format"
            >
              標準の課題形式
            </label>

            <select
              id="course-format"
              className="entry-input"
              value={courseDraft.defaultFormat}
              onChange={(event) =>
                updateCourseDraft(
                  'defaultFormat',
                  event.target.value,
                )
              }
            >
              <option value="Word">Word</option>
              <option value="PDFを読む">
                PDFを読む
              </option>
              <option value="学校のWebシステム">
                学校のWebシステム
              </option>
              <option value="紙">紙</option>
              <option value="その他">その他</option>
            </select>
          </div>

          <div className="form-field">
            <label
              className="input-label"
              htmlFor="course-first-step"
            >
              標準の最初の入口
            </label>

            <input
              id="course-first-step"
              className="entry-input"
              type="text"
              value={courseDraft.defaultFirstStep}
              onChange={(event) =>
                updateCourseDraft(
                  'defaultFirstStep',
                  event.target.value,
                )
              }
              placeholder="例：課題ページを開いて設問を読む"
            />
          </div>

          {courseError && <p className="weekly-editor-error" role="alert">{courseError}</p>}

          <div className="editor-actions">
            <button
              className="primary-button"
              type="button"
              onClick={saveCourse}
              disabled={courseDraft.name.trim() === ''}
            >
              保存する
            </button>

            <button
              className="cancel-button"
              type="button"
              onClick={cancelAddingCourse}
            >
              やめる
            </button>
          </div>
          {editingCourseId !== null && (
            <button className="delete-task-button" type="button" onClick={() => {
              const course = courses.find((item) => item.id === editingCourseId)
              if (course) deleteCourse(course)
            }}>
              授業を削除する
            </button>
          )}
        </div>
      )}
    </section>
  )
})

export default CourseTemplates
