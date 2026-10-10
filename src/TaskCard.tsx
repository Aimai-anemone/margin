import { useState } from 'react'

type Task = {
  title: string
  deadline: string
  format: string
  firstStep: string
}

const emptyTask: Task = {
  title: '',
  deadline: '',
  format: '学校のWebシステム',
  firstStep: '',
}

function TaskCard() {
  const [task, setTask] = useState<Task | null>(null)
  const [taskDraft, setTaskDraft] = useState<Task>(emptyTask)
  const [isEditing, setIsEditing] = useState(false)

  function startEditing() {
    setTaskDraft(task ?? emptyTask)
    setIsEditing(true)
  }

  function updateTaskDraft(
    field: keyof Task,
    value: string,
  ) {
    setTaskDraft((currentTask) => ({
      ...currentTask,
      [field]: value,
    }))
  }

  function saveTask() {
    const cleanedTitle = taskDraft.title.trim()

    if (cleanedTitle === '') {
      return
    }

    setTask({
      ...taskDraft,
      title: cleanedTitle,
      firstStep: taskDraft.firstStep.trim(),
    })

    setIsEditing(false)
  }

  function cancelEditing() {
    setTaskDraft(task ?? emptyTask)
    setIsEditing(false)
  }

  function formatDeadline(deadline: string) {
    if (deadline === '') {
      return '未設定'
    }

    const date = new Date(deadline)

    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <p className="section-label">次の課題</p>

          {!isEditing && (
            <h2 className="card-title">
              {task
                ? task.title
                : '登録された課題はありません'}
            </h2>
          )}
        </div>

        <span className="badge">
          {task ? '1件' : '0件'}
        </span>
      </div>

      {isEditing ? (
        <div className="task-editor">
          <div className="form-field">
            <label
              className="input-label"
              htmlFor="task-title"
            >
              課題名
            </label>

            <input
              id="task-title"
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
              htmlFor="task-deadline"
            >
              締切
            </label>

            <input
              id="task-deadline"
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
              htmlFor="task-format"
            >
              課題の形式
            </label>

            <select
              id="task-format"
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
              htmlFor="task-first-step"
            >
              最初の入口
            </label>

            <input
              id="task-first-step"
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
              onClick={saveTask}
              disabled={taskDraft.title.trim() === ''}
            >
              保存する
            </button>

            <button
              className="cancel-button"
              type="button"
              onClick={cancelEditing}
            >
              やめる
            </button>
          </div>
        </div>
      ) : task ? (
        <div className="task-summary">
          <p className="task-meta">
            締切：{formatDeadline(task.deadline)}
          </p>

          <p className="task-meta">
            形式：{task.format}
          </p>

          {task.firstStep && (
            <div className="task-first-step">
              <p className="section-label">
                最初の入口
              </p>

              <p>{task.firstStep}</p>
            </div>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={startEditing}
          >
            課題を編集する
          </button>
        </div>
      ) : (
        <>
          <p className="supporting-text">
            授業の設定を使って、課題を追加できます。
          </p>

          <button
            className="secondary-button"
            type="button"
            onClick={startEditing}
          >
            課題を追加
          </button>
        </>
      )}
    </section>
  )
}

export default TaskCard