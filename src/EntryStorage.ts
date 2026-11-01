import { readStoredText, saveStoredText, type SafeStorage } from './StorageSafety'

export const ENTRY_STORAGE_KEY = 'margin-entry'
export const loadEntryState = (storage?: SafeStorage) => readStoredText(ENTRY_STORAGE_KEY, '今日の入口', storage)
export const saveEntryValue = (value: string | null, storage?: SafeStorage) => saveStoredText(ENTRY_STORAGE_KEY, '今日の入口', value, storage)
