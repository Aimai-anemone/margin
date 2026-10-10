import { useState } from 'react'

const TASKS_STORAGE_KEY = 'margin-tasks'

type Task = {
  id: string
  title: string
  deadline: string
  format: string
  firstStep: string
}

const emptyTask: Omit<Task, 'id'> = {
  title: '',
  deadline: '',
  format: '学校のWebシステム',
  firstStep: '',
}

function loadTasks(): Task[] {
  const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY)

  if (savedTasks === null) {
    return []
  }

  try {
    const parsedTasks = JSON.parse(savedTasks)

    if (!Array.isArray(parsedTasks)) {
      return []
    }

    return parsedTasks as Task[]
  } catch {
    localStorage.removeItem(TASKS_STORAGE_KEY)
    return []
  }
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((firstTask, secondTask) => {
    if (
      firstTask.deadline === '' &&
      secondTask.deadline === ''
    ) {
      return 0
    }

    if (firstTask.deadline === '') {
      return 1
    }

    if (secondTask.deadline === '') {
      return -1
    }

    return (
      new Date(firstTask.deadline).getTime() -
      new Date(secondTask.deadline).getTime()
    )
  })
}

function TaskList() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [taskDraft, setTaskDraft] = useState(emptyTask)
  const [isAddingTask, setIsAddingTask] = useState(false)

  const sortedTasks = sortTasks(tasks)

  function updateTaskDraft(
    field: keyof typeof emptyTask,
    value: string,
  ) {
    setTaskDraft((currentTask) => ({
      ...currentTask,
      [field]: value,
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
  }

  saveTasks([...tasks, newTask])
  setTaskDraft(emptyTask)
  setIsAddingTask(false)
}

  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <p className="section-label">次の課題</p>

          <h2 className="card-title">
            {tasks.length === 0
              ? '登録された課題はありません'
              : `${tasks.length}件の課題があります`}
          </h2>
        </div>

        <span className="badge">
          {tasks.length}件
        </span>
      </div>

      {sortedTasks.length > 0 && (
        <div className="task-list">
          {sortedTasks.map((task) => (
            <article
              className="task-list-item"
              key={task.id}
            >
              <h3>{task.title}</h3>

              <p>
  {task.deadline === ''
    ? '締切は未設定です'
    : new Intl.DateTimeFormat('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(task.deadline))}
</p>
            </article>
          ))}
        </div>
      )}

      {!isAddingTask && (
        <>
          {tasks.length === 0 && (
            <p className="supporting-text">
              最初の課題を追加します。
            </p>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => setIsAddingTask(true)}
          >
            新しい課題を追加
          </button>
        </>
      )}

      {isAddingTask && (
        <div className="task-editor">
          <div className="form-field">
            <label
              className="input-label"
              htmlFor="new-task-title"
            >
              課題名
            </label>

            <input
              id="new-task-title"
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
              autoFocus
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
      setIsAddingTask(false)
    }}
  >
    やめる
  </button>
</div>
        </div>
      )}
    </section>
  )
}

export default TaskList