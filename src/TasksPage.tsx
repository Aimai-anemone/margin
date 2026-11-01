import { useRef, useState } from 'react'
import {
  type CourseTemplatesHandle,
} from './CourseTemplates'
import CourseTemplates from './CourseTemplates'
import CourseTimetable from './CourseTimetable'
import {
  loadCourseState,
  saveCourses,
  type Course,
} from './CourseStorage'
import TaskList from './TaskList'
import { type TaskListHandle } from './TaskList'
import { type TimetableSettings } from './TimetableStorage'
import { requireStoredData, storageFailureMessage } from './StorageSafety'

type Props = {
  settings: TimetableSettings
  onSettingsChange: (settings: TimetableSettings) => void
  settingsLoadError?: string
}

function TasksPage({ settings, onSettingsChange, settingsLoadError = '' }: Props) {
  const [courseState, setCourseState] = useState(loadCourseState)
  const courses = courseState.data
  const [courseError, setCourseError] = useState('')
  const taskListRef = useRef<TaskListHandle>(null)
  const courseTemplatesHandleRef = useRef<CourseTemplatesHandle>(null)

  function updateCourses(nextCourses: Course[]) {
    try {
      requireStoredData(courseState)
      saveCourses(nextCourses)
      setCourseState({ status: 'ready', data: nextCourses, error: '' })
      setCourseError('')
    } catch (error) {
      setCourseError(storageFailureMessage(error))
      throw error
    }
  }

  function startTaskForCourse(courseId: string) {
    // 保存に失敗した授業フォームの内容を、課題へ引き継がない。
    if (courseState.status === 'error' || courseError) return
    const course = courses.find(
      (savedCourse) => savedCourse.id === courseId,
    )

    if (course !== undefined) {
      taskListRef.current?.startAddingTaskForCourse(course)
    }
  }

  function startCourseForCell(weekday: string, period: string) {
    courseTemplatesHandleRef.current?.startAddingCourse({
      weekday,
      period,
      academicYear: settings.academicYear,
      term: settings.term,
    })
  }

  function startEditingCourse(courseId: string) {
    const course = courses.find(
      (savedCourse) => savedCourse.id === courseId,
    )

    if (course === undefined) {
      return
    }

    courseTemplatesHandleRef.current?.startEditingCourse(course)
  }

  function deleteCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId)
    if (course) courseTemplatesHandleRef.current?.deleteCourse(course)
  }

  return (
    <>
      {(courseState.error || courseError) && <p className="weekly-editor-error" role="alert">{courseState.error || courseError}</p>}
      {courseState.status === 'error' ? (
        <section className="card course-timetable">
          <h2 className="card-title">大学の時間割</h2>
          <p className="supporting-text">授業を読み込めないため、時間割の追加・変更を止めています。保存内容は残しています。</p>
        </section>
      ) : (
      <CourseTimetable
        settings={settings}
        settingsLoadError={settingsLoadError}
        onSettingsChange={onSettingsChange}
        courses={courses}
        onAddTask={startTaskForCourse}
        onAddCourse={startCourseForCell}
        onEditCourse={startEditingCourse}
        onDeleteCourse={deleteCourse}
      />
      )}
      <TaskList
        ref={taskListRef}
        courses={courses}
      />
      {courseState.status !== 'error' && <CourseTemplates
        academicYear={settings.academicYear}
        term={settings.term}
        showList={false}
        ref={courseTemplatesHandleRef}
        courses={courses}
        onSaveCourses={updateCourses}
      />}
    </>
  )
}

export default TasksPage
