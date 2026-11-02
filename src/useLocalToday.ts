import { useEffect, useState } from 'react'
import { getLocalDate } from './LoosePlanStorage'

export function useLocalToday() {
  const [today, setToday] = useState(getLocalDate)
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>
    const refresh = () => {
      setToday(getLocalDate())
      clearTimeout(midnightTimer)
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      midnightTimer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
    }
    refresh()
    // Also handles timezone / device clock changes while the app stays open.
    const interval = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(midnightTimer)
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
