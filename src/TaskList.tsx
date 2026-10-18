import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { type Course } from './CourseStorage'
import { TASKS_STORAGE_KEY, loadTasks, sortTasks, type Task } from './TaskStorage'

type TaskDraft = Omit<Task, 'id' | 'completed'>

const emptyTask: TaskDraft = {
  title: '',
  deadline: '',
  format: '学校のWebシステム',
  firstStep: '',
}
type TaskListProps = {
  courses: Course[]
}

export type TaskListHandle = {
  startAddingTaskForCourse: (course: Course) => void
}

const TaskList = forwardRef<TaskListHandle, TaskListProps>(
  function TaskList({ courses }, ref) {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
const [selectedCourseId, setSelectedCourseId] =
  useState('')

  const [taskDraft, setTaskDraft] = useState(emptyTask)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [selectedTaskId, setSelectedTaskId] =
   useState<string | null>(null)

const [isEditingSelectedTask, setIsEditingSelectedTask] =
  useState(false)

const [isShowingCompletedTasks, setIsShowingCompletedTasks] =
  useState(false)
  const taskFormRef = useRef<HTMLDivElement>(null)
  const taskTitleRef = useRef<HTMLInputElement>(null)
  const initialTaskDraftRef = useRef<TaskDraft>(emptyTask)

  const activeTasks = tasks.filter(
  (task) => !task.completed,
)

const completedTasks = tasks.filter(
  (task) => task.completed,
)

const sortedTasks = sortTasks(activeTasks)

  const selectedTask =
   tasks.find((task) => task.id === selectedTaskId) ?? null

  function canReplaceTaskDraft() {
    return !(isAddingTask || isEditingSelectedTask) ||
      JSON.stringify(taskDraft) === JSON.stringify(initialTaskDraftRef.current) ||
      window.confirm('入力中の課題の変更を破棄して、新しい課題フォームを開きますか？')
  }

  function startAddingTask(course?: Course) {
      if (!canReplaceTaskDraft()) return
      const nextDraft = {
        ...emptyTask,
        format: course?.defaultFormat ?? emptyTask.format,
        firstStep: course?.defaultFirstStep ?? emptyTask.firstStep,
      }
      initialTaskDraftRef.current = nextDraft
      setTaskDraft(nextDraft)
      setSelectedCourseId(course?.id ?? '')
      setSelectedTaskId(null)
      setIsEditingSelectedTask(false)
      setIsAddingTask(true)

      requestAnimationFrame(() => {
        taskTitleRef.current?.focus({ preventScroll: true })
        taskFormRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
  }

  function startAddingTaskForCourse(course: Course) {
    startAddingTask(course)
  }

  useImperativeHandle(ref, () => ({
    startAddingTaskForCourse,
  }))

  function updateTaskDraft(
    field: keyof TaskDraft,
    value: string,
  ) {
    setTaskDraft((currentTask) => ({
      ...currentTask,
      [field]: value,
    }))
  }
function selectCourse(courseId: string) {
  setSelectedCourseId(courseId)

  const selectedCourse = courses.find(
    (course) => course.id === courseId,
  )

  if (selectedCourse === undefined) {
    return
  }

  setTaskDraft((currentTask) => ({
    ...currentTask,
    format: selectedCourse.defaultFormat,
    firstStep: selectedCourse.defaultFirstStep,
  }))
}

  function saveTasks(nextTasks: Task[]) {
  const sortedNextTasks = sortTasks(nextTasks)

  setTasks(sortedNextTasks)

  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(sortedNextTasks),
  )
}

function addTask() {
  const cleanedTitle = taskDraft.title.trim()

  if (cleanedTitle === '') {
    return
  }

  const newTask: Task = {
    id: crypto.randomUUID(),
    title: cleanedTitle,
    deadline: taskDraft.deadline,
    format: taskDraft.format,
    firstStep: taskDraft.firstStep.trim(),
    completed: false,
  }

  saveTasks([...tasks, newTask])
  setTaskDraft(emptyTask)
  setSelectedCourseId('')
  setIsAddingTask(false)
}

function startEditingSelectedTask() {
  if (selectedTask === null) {
    return
  }

  if (!canReplaceTaskDraft()) return

  const nextDraft = {
    title: selectedTask.title,
    deadline: selectedTask.deadline,
    format: selectedTask.format,
    firstStep: selectedTask.firstStep,
  }
  initialTaskDraftRef.current = nextDraft
  setTaskDraft(nextDraft)
  setIsAddingTask(false)
  setSelectedCourseId('')

  setIsEditingSelectedTask(true)
}

function saveEditedTask() {
  if (selectedTaskId === null) {
    return
  }

  const cleanedTitle = taskDraft.title.trim()

  if (cleanedTitle === '') {
    return
  }

  const updatedTasks = tasks.map((task) => {
    if (task.id !== selectedTaskId) {
      return task
    }

    return {
      ...task,
      title: cleanedTitle,
      deadline: taskDraft.deadline,
      format: taskDraft.format,
      firstStep: taskDraft.firstStep.trim(),
    }
  })

  saveTasks(updatedTasks)
  setIsEditingSelectedTask(false)
}

function cancelEditingSelectedTask() {
  setIsEditingSelectedTask(false)
}

function completeSelectedTask() {
  if (selectedTaskId === null) {
    return
  }

  const shouldComplete = window.confirm(
    'この課題を完了にしますか？',
  )

  if (!shouldComplete) {
    return
  }

  const updatedTasks = tasks.map((task) => {
    if (task.id !== selectedTaskId) {
      return task
    }

    return {
      ...task,
      completed: true,
    }
  })

  saveTasks(updatedTasks)
  setSelectedTaskId(null)
  setIsEditingSelectedTask(false)
  setTaskDraft(emptyTask)
}

function restoreCompletedTask(taskId: string) {
  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId) {
      return task
    }

    return {
      ...task,
      completed: false,
    }
  })

  saveTasks(updatedTasks)
}

function deleteSelectedTask() {
  if (selectedTaskId === null) {
    return
  }

  const shouldDelete = window.confirm(
    'この課題を削除しますか？',
  )

  if (!shouldDelete) {
    return
  }

  const remainingTasks = tasks.filter(
    (task) => task.id !== selectedTaskId,
  )

  saveTasks(remainingTasks)
  setSelectedTaskId(null)
  setIsEditingSelectedTask(false)
  setTaskDraft(emptyTask)
}

  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <p className="section-label">次の課題</p>

          <h2 className="card-title">
            {activeTasks.length === 0
              ? '登録された課題はありません'
              : `${activeTasks.length}件の課題があります`}
          </h2>
        </div>

        <span className="badge">
          {activeTasks.length}件
        </span>
      </div>

      {sortedTasks.length > 0 && (
  <div className="task-list">
    {sortedTasks.map((task) => {
      const deadlineText =
        task.deadline === ''
          ? '締切は未設定です'
          : new Intl.DateTimeFormat('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(task.deadline))

      return (
        <button
          className="task-list-item"
          type="button"
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
        >
          <h3>{task.title}</h3>
          <p>{deadlineText}</p>
        </button>
      )
    })}
  </div>
)}
      {selectedTask && (
  <div className="task-detail">
    <div className="task-detail-header">
      <div>
        <p className="section-label">
          課題の詳細
        </p>

        <h3>{selectedTask.title}</h3>
      </div>

      <button
        className="detail-close-button"
        type="button"
        onClick={() => {
  setSelectedTaskId(null)
  setIsEditingSelectedTask(false)
}}

      >
        閉じる
      </button>
    </div>

    <div className="task-detail-row">
      <span>締切</span>

      <strong>
        {selectedTask.deadline === ''
          ? '未設定'
          : new Intl.DateTimeFormat('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }).format(
              new Date(selectedTask.deadline),
            )}
      </strong>
    </div>

    <div className="task-detail-row">
      <span>形式</span>
      <strong>{selectedTask.format}</strong>
    </div>

    <div className="task-detail-step">
      <p className="section-label">
        最初の入口
      </p>

      <p>
        {selectedTask.firstStep ||
          '最初の入口は設定されていません。'}
      </p>
    </div>
   {!isEditingSelectedTask && (
  <div className="task-detail-actions">
    <button
      className="secondary-button"
      type="button"
      onClick={startEditingSelectedTask}
    >
      編集する
    </button>

    <button
      className="complete-task-button"
      type="button"
      onClick={completeSelectedTask}
    >
      完了にする
    </button>

    <button
      className="delete-task-button"
      type="button"
      onClick={deleteSelectedTask}
    >
      削除する
    </button>
  </div>
)}
  </div>
)}

{selectedTask && isEditingSelectedTask && (
  <div className="task-editor selected-task-editor">
    <p className="section-label">課題を編集</p>

    <div className="form-field">
      <label
        className="input-label"
        htmlFor="edit-task-title"
      >
        課題名
      </label>

      <input
        id="edit-task-title"
        className="entry-input"
        type="text"
        value={taskDraft.title}
        onChange={(event) =>
          updateTaskDraft(
            'title',
            event.target.value,
          )
        }
        autoFocus
      />
    </div>

    <div className="form-field">
      <label
        className="input-label"
        htmlFor="edit-task-deadline"
      >
        締切
      </label>

      <input
        id="edit-task-deadline"
        className="entry-input"
        type="datetime-local"
        value={taskDraft.deadline}
        onChange={(event) =>
          updateTaskDraft(
            'deadline',
            event.target.value,
          )
        }
      />
    </div>

    <div className="form-field">
      <label
        className="input-label"
        htmlFor="edit-task-format"
      >
        課題の形式
      </label>

      <select
        id="edit-task-format"
        className="entry-input"
        value={taskDraft.format}
        onChange={(event) =>
          updateTaskDraft(
            'format',
            event.target.value,
          )
        }
      >
        <option value="Word">Word</option>
        <option value="PDFを読む">PDFを読む</option>

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
        htmlFor="edit-task-first-step"
      >
        最初の入口
      </label>

      <input
        id="edit-task-first-step"
        className="entry-input"
        type="text"
        value={taskDraft.firstStep}
        onChange={(event) =>
          updateTaskDraft(
            'firstStep',
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
        onClick={saveEditedTask}
        disabled={taskDraft.title.trim() === ''}
      >
        変更を保存する
      </button>

      <button
        className="cancel-button"
        type="button"
        onClick={cancelEditingSelectedTask}
      >
        やめる
      </button>
    </div>
  </div>
)}

      {!isAddingTask && (
        <>
          {activeTasks.length === 0 && (
            <p className="supporting-text">
              最初の課題を追加します。
            </p>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => startAddingTask()}
          >
            新しい課題を追加
          </button>
        </>
      )}

      {isAddingTask && (
        <div className="task-editor" ref={taskFormRef}>
          {courses.length > 0 && (
  <div className="form-field">
    <label
      className="input-label"
      htmlFor="new-task-course"
    >
      授業テンプレート
    </label>

    <select
      id="new-task-course"
      className="entry-input"
      value={selectedCourseId}
      onChange={(event) =>
        selectCourse(event.target.value)
      }
    >
      <option value="">授業を選択してください</option>

      {courses.map((course) => (
        <option
          key={course.id}
          value={course.id}
        >
          {course.name}（{course.weekday}・
          {course.period}）
        </option>
      ))}
    </select>
  </div>
)}
          <div className="form-field">
            <label
              className="input-label"
              htmlFor="new-task-title"
            >
              課題名
            </label>

            <input
              id="new-task-title"
              ref={taskTitleRef}
              className="entry-input"
              type="text"
              value={taskDraft.title}
              onChange={(event) =>
                updateTaskDraft(
                  'title',
                  event.target.value,
                )
              }
              placeholder="例：心理学リアクションペーパー"
            />
          </div>

          <div className="form-field">
  <label
    className="input-label"
    htmlFor="new-task-deadline"
  >
    締切
  </label>

  <input
    id="new-task-deadline"
    className="entry-input"
    type="datetime-local"
    value={taskDraft.deadline}
    onChange={(event) =>
      updateTaskDraft(
        'deadline',
        event.target.value,
      )
    }
  />
</div>

<div className="form-field">
  <label
    className="input-label"
    htmlFor="new-task-format"
  >
    課題の形式
  </label>

  <select
    id="new-task-format"
    className="entry-input"
    value={taskDraft.format}
    onChange={(event) =>
      updateTaskDraft(
        'format',
        event.target.value,
      )
    }
  >
    <option value="Word">Word</option>
    <option value="PDFを読む">PDFを読む</option>
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
    htmlFor="new-task-first-step"
  >
    最初の入口
  </label>

  <input
    id="new-task-first-step"
    className="entry-input"
    type="text"
    value={taskDraft.firstStep}
    onChange={(event) =>
      updateTaskDraft(
        'firstStep',
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
    onClick={addTask}
    disabled={taskDraft.title.trim() === ''}
  >
    保存する
  </button>

  <button
    className="cancel-button"
    type="button"
    onClick={() => {
      setTaskDraft(emptyTask)
      setSelectedCourseId('')
      setIsAddingTask(false)
    }}
  >
    やめる
  </button>
</div>
        </div>
      )}

{completedTasks.length > 0 && (
  <div className="completed-tasks-section">
    <button
      className="completed-tasks-toggle"
      type="button"
      onClick={() =>
        setIsShowingCompletedTasks(
          (currentValue) => !currentValue,
        )
      }
    >
      <span>完了済み</span>

      <span>
        {completedTasks.length}件・
        {isShowingCompletedTasks ? '閉じる' : '見る'}
      </span>
    </button>

   {isShowingCompletedTasks && (
  <div className="completed-task-list">
    {completedTasks.map((task) => (
      <div
        className="completed-task-item"
        key={task.id}
      >
        <div className="completed-task-info">
          <span className="completed-task-title">
            {task.title}
          </span>

          <span className="completed-task-status">
            完了
          </span>
        </div>

        <button
          className="restore-task-button"
          type="button"
          onClick={() => restoreCompletedTask(task.id)}
        >
          未完了に戻す
        </button>
      </div>
    ))}
  </div>
)}
      </div>
    )}
    </section>
  )
  },
)

export default TaskList
