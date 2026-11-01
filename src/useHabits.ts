import { useState } from 'react'
import {
  changeHabitStatus, deleteHiddenHabit, habitRecoveryRequired, loadHabitData, saveHabit,
  type HabitData, type HabitDraft, type HabitStatus,
} from './HabitStorage'
import { storageFailureMessage } from './StorageSafety'

export function useHabits() {
  const [state, setState] = useState(loadHabitData)

  function update(operation: () => HabitData) {
    try {
      const data = operation()
      setState({ data, error: '' })
    } catch (error) {
      if (habitRecoveryRequired()) {
        setState((current) => ({ ...current, error: storageFailureMessage(error) }))
      }
      throw error
    }
  }

  return {
    ...state,
    save: (draft: HabitDraft, id?: string) => update(() => saveHabit(draft, id)),
    changeStatus: (id: string, status: HabitStatus) => update(() => changeHabitStatus(id, status)),
    remove: (id: string) => update(() => deleteHiddenHabit(id)),
  }
}

export type HabitsController = ReturnType<typeof useHabits>
