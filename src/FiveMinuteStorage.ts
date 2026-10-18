import { isValidRecordDate } from './DailyRecordStorage'
import { getLocalDate } from './LoosePlanStorage'

export const FIVE_MINUTE_STORAGE_KEY = 'margin-five-minute-starts'
export const FIVE_MINUTE_DURATION = 5 * 60 * 1000
const MAX_DAILY_STARTS = 1000
const MAX_TIMER_AGE = 7 * 24 * 60 * 60 * 1000
const CLOCK_TOLERANCE = 5 * 60 * 1000

export type FiveMinuteCount = { date: string; count: number }
export type FiveMinuteTimer = {
  id: string
  date: string
  startedAt: number
  endsAt: number
  content: string
  taskId?: string
  counted: boolean
}
export type FiveMinuteState = {
  counts: FiveMinuteCount[]
  activeTimer: FiveMinuteTimer | null
}

export function isFiveMinuteCounts(value: unknown): value is FiveMinuteCount[] {
  return Array.isArray(value) && value.every((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
    const count = item as Record<string, unknown>
    return isValidRecordDate(count.date) && typeof count.count === 'number' &&
      Number.isSafeInteger(count.count) && count.count >= 0 && count.count <= MAX_DAILY_STARTS
  }) && new Set(value.map((item) => item.date)).size === value.length
}

function isTimer(value: unknown): value is FiveMinuteTimer {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const timer = value as Record<string, unknown>
  return typeof timer.id === 'string' && timer.id.trim() !== '' &&
    isValidRecordDate(timer.date) && typeof timer.content === 'string' && timer.content.trim() !== '' &&
    (timer.taskId === undefined || (typeof timer.taskId === 'string' && timer.taskId.trim() !== '')) &&
    typeof timer.startedAt === 'number' && Number.isSafeInteger(timer.startedAt) && timer.startedAt > 0 &&
    typeof timer.endsAt === 'number' && Number.isSafeInteger(timer.endsAt) &&
    timer.endsAt === timer.startedAt + FIVE_MINUTE_DURATION && typeof timer.counted === 'boolean'
}

function readStoredState(): { counts: FiveMinuteCount[]; activeTimer: unknown } {
  try {
    const raw = localStorage.getItem(FIVE_MINUTE_STORAGE_KEY)
    if (raw === null) return { counts: [], activeTimer: null }
    const value: unknown = JSON.parse(raw)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const saved = value as Record<string, unknown>
      if (isFiveMinuteCounts(saved.counts)) {
        return { counts: saved.counts, activeTimer: saved.activeTimer }
      }
    }
  } catch { /* 保存内容は上書きしない。 */ }
  throw new Error('5分の着手回数を読み込めません。保存内容を残しています。バックアップやブラウザーの保存設定を確認してください。')
}

function writeState(state: FiveMinuteState) {
  if (!isFiveMinuteCounts(state.counts) || (state.activeTimer !== null && !isTimer(state.activeTimer))) {
    throw new Error('5分の着手データを確認してください。保存は行っていません。')
  }
  try {
    localStorage.setItem(FIVE_MINUTE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    throw new Error('5分の着手データを保存できませんでした。端末の空き容量やブラウザーの保存設定を確認してください。')
  }
}

export function readFiveMinuteCounts(): FiveMinuteCount[] {
  return readStoredState().counts
}

export function hasFiveMinuteCounts() {
  try {
    return readFiveMinuteCounts().length > 0
  } catch {
    return localStorage.getItem(FIVE_MINUTE_STORAGE_KEY) !== null
  }
}

export function restoreFiveMinuteCounts(counts: FiveMinuteCount[]) {
  // バックアップに一時タイマーを持ち込まず、復元時には現在のタイマーも終了する。
  writeState({ counts, activeTimer: null })
}

export function reconcileFiveMinuteStart(now = Date.now()): { state: FiveMinuteState; notice: string } {
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error('端末の日付と時刻を確認してください。')
  const saved = readStoredState()
  if (saved.activeTimer === null) return { state: { ...saved, activeTimer: null }, notice: '' }
  if (!isTimer(saved.activeTimer) || now < saved.activeTimer.startedAt - CLOCK_TOLERANCE ||
    now > saved.activeTimer.endsAt + MAX_TIMER_AGE) {
    const state = { counts: saved.counts, activeTimer: null }
    writeState(state)
    return { state, notice: '前のタイマーは保存時刻を確認できないため終了しました。保存済みの回数は残っています。' }
  }

  const timer = saved.activeTimer
  const state: FiveMinuteState = { counts: saved.counts, activeTimer: timer }
  if (now >= timer.endsAt && !timer.counted) {
    const existing = state.counts.find((item) => item.date === timer.date)
    const count = (existing?.count ?? 0) + 1
    if (count > MAX_DAILY_STARTS) throw new Error('この日の着手回数が通常の範囲を超えています。保存内容を確認してください。')
    const nextState: FiveMinuteState = {
      counts: existing
        ? state.counts.map((item) => item.date === timer.date ? { ...item, count } : item)
        : [...state.counts, { date: timer.date, count }],
      activeTimer: { ...timer, counted: true },
    }
    // 回数と反映済み印を1回の書き込みで更新し、途中で片方だけ保存されるのを防ぐ。
    writeState(nextState)
    return { state: nextState, notice: '' }
  }
  return { state, notice: '' }
}

export function startFiveMinuteStart(content: string, taskId?: string, now = Date.now()) {
  const { state } = reconcileFiveMinuteStart(now)
  if (state.activeTimer !== null) return state
  const title = content.trim()
  if (!title) throw new Error('5分で始めることを選択または入力してください。')
  const nextState: FiveMinuteState = {
    ...state,
    activeTimer: {
      id: crypto.randomUUID(), date: getLocalDate(), startedAt: now,
      endsAt: now + FIVE_MINUTE_DURATION, content: title,
      ...(taskId ? { taskId } : {}), counted: false,
    },
  }
  writeState(nextState)
  return nextState
}

export function cancelFiveMinuteStart(timerId: string, now = Date.now()) {
  const { state } = reconcileFiveMinuteStart(now)
  if (state.activeTimer?.id !== timerId || state.activeTimer.counted) return state
  const nextState = { ...state, activeTimer: null }
  writeState(nextState)
  return nextState
}

export function finishFiveMinuteStart(timerId: string, now = Date.now()) {
  const { state } = reconcileFiveMinuteStart(now)
  if (state.activeTimer?.id !== timerId) return state
  if (!state.activeTimer.counted) throw new Error('まだ5分の途中です。')
  const nextState = { ...state, activeTimer: null }
  writeState(nextState)
  return nextState
}

export function remainingFiveMinuteSeconds(timer: FiveMinuteTimer | null, now = Date.now()) {
  if (timer === null || timer.counted) return 0
  return Math.max(0, Math.min(300, Math.ceil((timer.endsAt - now) / 1000)))
}
