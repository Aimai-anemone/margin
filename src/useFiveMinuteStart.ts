import { useCallback, useEffect, useState } from 'react'
import { getLocalDate } from './LoosePlanStorage'
import {
  FIVE_MINUTE_STORAGE_KEY, cancelFiveMinuteStart, finishFiveMinuteStart,
  reconcileFiveMinuteStart, remainingFiveMinuteSeconds, startFiveMinuteStart,
  type FiveMinuteState,
} from './FiveMinuteStorage'

type View = {
  state: FiveMinuteState
  today: string
  remainingSeconds: number
  error: string
  notice: string
}

async function withTimerLock<T>(operation: () => T): Promise<T> {
  // 対応ブラウザーでは、別ウィンドウの読み書きも同じ順番にそろえる。
  if (navigator.locks) return navigator.locks.request(FIVE_MINUTE_STORAGE_KEY, operation)
  return operation()
}

export function useFiveMinuteStart() {
  const [view, setView] = useState<View>(() => ({
    state: { counts: [], activeTimer: null }, today: getLocalDate(),
    remainingSeconds: 0, error: '', notice: '',
  }))

  const synchronize = useCallback(async (operation?: () => FiveMinuteState) => {
    try {
      return await withTimerLock(() => {
        const now = Date.now()
        const result = operation ? { state: operation(), notice: '' } : reconcileFiveMinuteStart(now)
        setView((current) => {
          const next: View = {
            ...result, today: getLocalDate(),
            remainingSeconds: remainingFiveMinuteSeconds(result.state.activeTimer, now),
            error: '', notice: operation ? '' : result.notice || current.notice,
          }
          return JSON.stringify(current) === JSON.stringify(next) ? current : next
        })
        return result.state
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '5分の着手データを確認できませんでした。'
      setView((current) => current.error === message ? current : { ...current, error: message })
      return null
    }
  }, [])

  useEffect(() => {
    const refresh = () => { void synchronize() }
    refresh()
    const interval = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    const onStorage = (event: StorageEvent) => {
      if (event.key === FIVE_MINUTE_STORAGE_KEY || event.key === null) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [synchronize])

  return {
    ...view,
    start: (content: string, taskId?: string) => synchronize(() => startFiveMinuteStart(content, taskId)),
    cancel: (id: string) => synchronize(() => cancelFiveMinuteStart(id)),
    finish: (id: string) => synchronize(() => finishFiveMinuteStart(id)),
    refresh: () => synchronize(),
  }
}

export type FiveMinuteController = ReturnType<typeof useFiveMinuteStart>
