import { useCallback, useEffect, useState } from 'react'
import {
  changeHabitStatus, deleteHiddenHabit, habitRecoveryRequired, loadHabitData, saveHabit,
  type HabitData, type HabitDraft, type HabitStatus,
  saveHabitRecord, cancelHabitRecord, type HabitResult,
} from './HabitStorage'
import { storageFailureMessage, StorageSafetyError } from './StorageSafety'
import { getLocalDate } from './LoosePlanStorage'

export function useHabits() {
  const [state, setState] = useState(loadHabitData)
  const [today, setToday] = useState(() => getLocalDate())
  const refresh = useCallback(() => {
    setToday(getLocalDate())
    const next = loadHabitData()
    setState((current) => next.error ? { ...current, error: next.error } : next)
  }, [])
  useEffect(() => {
    const interval = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [refresh])

  function update(operation: () => HabitData) {
    try {
      const data = operation()
      setState({ data, error: '' })
    } catch (error) {
      if (habitRecoveryRequired() || (error instanceof StorageSafetyError && error.reason === 'unreadable')) {
        setState((current) => ({ ...current, error: storageFailureMessage(error) }))
      }
      throw error
    }
  }

  return {
    ...state,
    today, refresh,
    record: (id: string, date: string, result: HabitResult) => update(() => saveHabitRecord(id, date, result)),
    cancelRecord: (id: string, date: string) => update(() => cancelHabitRecord(id, date)),
    save: (draft: HabitDraft, id?: string) => update(() => saveHabit(draft, id)),
    changeStatus: (id: string, status: HabitStatus) => update(() => changeHabitStatus(id, status)),
    remove: (id: string) => update(() => deleteHiddenHabit(id)),
  }
}

export type HabitsController = ReturnType<typeof useHabits>
