export const TASKS_STORAGE_KEY = 'margin-tasks'

export type Task = {
  id: string
  title: string
  deadline: string
  format: string
  firstStep: string
  completed: boolean
}

export function loadTasks(): Task[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is Task => {
      if (typeof value !== 'object' || value === null) return false
      const task = value as Record<string, unknown>
      return typeof task.id === 'string' && typeof task.title === 'string' &&
        typeof task.deadline === 'string' && typeof task.format === 'string' &&
        typeof task.firstStep === 'string' &&
        (task.completed === undefined || typeof task.completed === 'boolean')
    }).map((task) => ({ ...task, completed: task.completed ?? false }))
  } catch {
    // 読み取りだけを行い、壊れた保存内容も削除しない。
    return []
  }
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((firstTask, secondTask) => {
    if (firstTask.deadline === '' && secondTask.deadline === '') return 0
    if (firstTask.deadline === '') return 1
    if (secondTask.deadline === '') return -1
    return new Date(firstTask.deadline).getTime() - new Date(secondTask.deadline).getTime()
  })
}
