export type SafeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type StorageReadResult<T> = {
  status: 'missing' | 'ready' | 'error'
  data: T
  error: string
  reason?: 'json' | 'structure' | 'access'
}

export class StorageSafetyError extends Error {
  reason: 'unreadable' | 'invalid' | 'quota' | 'write'

  constructor(reason: StorageSafetyError['reason'], message: string) {
    super(message)
    this.name = 'StorageSafetyError'
    this.reason = reason
  }
}

export function storageFailureMessage(error: unknown, fallback = '保存できませんでした。入力内容を残したまま、端末の空き容量やブラウザーの保存設定を確認してください。') {
  return error instanceof StorageSafetyError ? error.message : fallback
}

function readError<T>(data: T, label: string, reason: StorageReadResult<T>['reason']): StorageReadResult<T> {
  return {
    status: 'error', data, reason,
    error: `${label}の保存データを読み込めませんでした。新しい内容を保存せず、設定タブのバックアップを確認してください。保存内容は変更していません。`,
  }
}

export function readStoredText(key: string, label: string, storage?: SafeStorage): StorageReadResult<string> {
  try {
    const raw = (storage ?? localStorage).getItem(key)
    if (raw === null) return { status: 'missing', data: '', error: '' }
    if (typeof raw !== 'string') return readError('', label, 'structure')
    // 今日の入口はJSONではなく、文章そのものを保存する既存形式。
    return { status: 'ready', data: raw, error: '' }
  } catch {
    return readError('', label, 'access')
  }
}

export function readStoredJson<T>(
  key: string, label: string, empty: T,
  parse: (value: unknown) => T | null,
  storage?: SafeStorage,
): StorageReadResult<T> {
  const raw = readStoredText(key, label, storage)
  if (raw.status === 'error') return readError(empty, label, raw.reason)
  if (raw.status === 'missing') return { status: 'missing', data: empty, error: '' }
  let value: unknown
  try {
    value = JSON.parse(raw.data)
  } catch {
    return readError(empty, label, 'json')
  }
  try {
    const data = parse(value)
    return data === null ? readError(empty, label, 'structure') : { status: 'ready', data, error: '' }
  } catch {
    return readError(empty, label, 'structure')
  }
}

export function requireStoredData<T>(result: StorageReadResult<T>): T {
  if (result.status === 'error') throw new StorageSafetyError('unreadable', result.error)
  return result.data
}

function writeChecked(key: string, label: string, value: string | null, current: StorageReadResult<unknown>, storage?: SafeStorage) {
  requireStoredData(current)
  try {
    const target = storage ?? localStorage
    if (value === null) target.removeItem(key)
    else target.setItem(key, value)
  } catch (error) {
    const quota = typeof error === 'object' && error !== null && 'name' in error &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    throw new StorageSafetyError(quota ? 'quota' : 'write',
      `${label}を保存できませんでした。${quota ? '端末の保存容量が不足している可能性があります。' : ''}入力内容を残したまま、端末の空き容量やブラウザーの保存設定を確認してください。`)
  }
}

export function saveStoredText(key: string, label: string, value: string | null, storage?: SafeStorage) {
  if (value !== null && typeof value !== 'string') throw new StorageSafetyError('invalid', `${label}の入力内容を確認してください。保存は行っていません。`)
  writeChecked(key, label, value, readStoredText(key, label, storage), storage)
}

export function saveStoredJson<T>(key: string, label: string, value: T, parse: (value: unknown) => T | null, empty: T, storage?: SafeStorage) {
  // 保存直前にも読み直し、起動後に壊れたキーも空データなどで上書きしない。
  const current = readStoredJson(key, label, empty, parse, storage)
  requireStoredData(current)
  if (parse(value) === null) throw new StorageSafetyError('invalid', `${label}の入力内容を確認してください。保存は行っていません。`)
  writeChecked(key, label, JSON.stringify(value), current, storage)
}
