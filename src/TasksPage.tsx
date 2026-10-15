import { useRef, useState } from 'react'
import {
  type CourseTemplatesHandle,
} from './CourseTemplates'
import CourseTemplates from './CourseTemplates'
import CourseTimetable from './CourseTimetable'
import {
  loadCourses,
  saveCourses,
  type Course,
} from './CourseStorage'
import TaskList from './TaskList'
import { type TaskListHandle } from './TaskList'
import { type TimetableSettings } from './TimetableStorage'

type Props = {
  settings: TimetableSettings
  onSettingsChange: (settings: TimetableSettings) => void
}

function TasksPage({ settings, onSettingsChange }: Props) {
  const [courses, setCourses] = useState<Course[]>(loadCourses)
  const taskListRef = useRef<TaskListHandle>(null)
  const courseTemplatesHandleRef = useRef<CourseTemplatesHandle>(null)

  function updateCourses(nextCourses: Course[]) {
    saveCourses(nextCourses)
    setCourses(nextCourses)
  }

  function startTaskForCourse(courseId: string) {
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
      <CourseTimetable
        settings={settings}
        onSettingsChange={onSettingsChange}
        courses={courses}
        onAddTask={startTaskForCourse}
        onAddCourse={startCourseForCell}
        onEditCourse={startEditingCourse}
        onDeleteCourse={deleteCourse}
      />
      <TaskList
        ref={taskListRef}
        courses={courses}
      />
      <CourseTemplates
        academicYear={settings.academicYear}
        term={settings.term}
        showList={false}
        ref={courseTemplatesHandleRef}
        courses={courses}
        onSaveCourses={updateCourses}
      />
    </>
  )
}

export default TasksPage
