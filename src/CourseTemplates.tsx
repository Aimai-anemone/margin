import { useState } from 'react'

const COURSES_STORAGE_KEY = 'margin-courses'

type Course = {
  id: string
  name: string
  weekday: string
  period: string
  defaultFormat: string
  defaultFirstStep: string
}

type CourseDraft = Omit<Course, 'id'>

const emptyCourse: CourseDraft = {
  name: '',
  weekday: '月曜日',
  period: '1限',
  defaultFormat: '学校のWebシステム',
  defaultFirstStep: '',
}

function loadCourses(): Course[] {
  const savedCourses = localStorage.getItem(
    COURSES_STORAGE_KEY,
  )

  if (savedCourses === null) {
    return []
  }

  try {
    const parsedCourses = JSON.parse(savedCourses)

    if (!Array.isArray(parsedCourses)) {
      return []
    }

    return parsedCourses as Course[]
  } catch {
    localStorage.removeItem(COURSES_STORAGE_KEY)
    return []
  }
}

function CourseTemplates() {
  const [courses, setCourses] =
    useState<Course[]>(loadCourses)

  const [courseDraft, setCourseDraft] =
    useState<CourseDraft>(emptyCourse)

  const [isAddingCourse, setIsAddingCourse] =
    useState(false)
    const [editingCourseId, setEditingCourseId] =
  useState<string | null>(null)

  function updateCourseDraft(
    field: keyof CourseDraft,
    value: string,
  ) {
    setCourseDraft((currentCourse) => ({
      ...currentCourse,
      [field]: value,
    }))
  }

  function saveCourses(nextCourses: Course[]) {
    setCourses(nextCourses)

    localStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify(nextCourses),
    )
  }
function startEditingCourse(course: Course) {
  setCourseDraft({
    name: course.name,
    weekday: course.weekday,
    period: course.period,
    defaultFormat: course.defaultFormat,
    defaultFirstStep: course.defaultFirstStep,
  })

  setEditingCourseId(course.id)
  setIsAddingCourse(true)
}

 function saveCourse() {
  const cleanedName = courseDraft.name.trim()

  if (cleanedName === '') {
    return
  }

  if (editingCourseId !== null) {
    const updatedCourses = courses.map((course) => {
      if (course.id !== editingCourseId) {
        return course
      }

      return {
        ...course,
        name: cleanedName,
        weekday: courseDraft.weekday,
        period: courseDraft.period,
        defaultFormat: courseDraft.defaultFormat,
        defaultFirstStep:
          courseDraft.defaultFirstStep.trim(),
      }
    })

    saveCourses(updatedCourses)
  } else {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      name: cleanedName,
      weekday: courseDraft.weekday,
      period: courseDraft.period,
      defaultFormat: courseDraft.defaultFormat,
      defaultFirstStep:
        courseDraft.defaultFirstStep.trim(),
    }

    saveCourses([...courses, newCourse])
  }

  setCourseDraft(emptyCourse)
  setEditingCourseId(null)
  setIsAddingCourse(false)
}

  function cancelAddingCourse() {
    setCourseDraft(emptyCourse)
    setEditingCourseId(null)
    setIsAddingCourse(false)
  }
function deleteCourse(course: Course) {
  const shouldDelete = window.confirm(
    `「${course.name}」を削除しますか？`,
  )

  if (!shouldDelete) {
    return
  }

  const remainingCourses = courses.filter(
    (savedCourse) => savedCourse.id !== course.id,
  )

  saveCourses(remainingCourses)

  if (editingCourseId === course.id) {
    setCourseDraft(emptyCourse)
    setEditingCourseId(null)
    setIsAddingCourse(false)
  }
}
  return (
    <section className="card course-templates">
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
            onClick={() => {
  setCourseDraft(emptyCourse)
  setEditingCourseId(null)
  setIsAddingCourse(true)
}}

          >
            授業を追加
          </button>
        </>
      )}

      {isAddingCourse && (
        <div className="course-editor">
          <div className="form-field">
            <label
              className="input-label"
              htmlFor="course-name"
            >
              授業名
            </label>

            <input
              id="course-name"
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
              autoFocus
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
                <option value="1限">1限</option>
                <option value="2限">2限</option>
                <option value="3限">3限</option>
                <option value="4限">4限</option>
                <option value="5限">5限</option>
                <option value="6限">6限</option>
                <option value="その他">その他</option>
              </select>
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
        </div>
      )}
    </section>
  )
}

export default CourseTemplates