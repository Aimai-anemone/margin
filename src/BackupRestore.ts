type RestoreValue = { key: string; value: string | null }
type RestoreStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type BackupRestoreResult =
  | { status: 'success' }
  | { status: 'snapshot-failed' }
  | { status: 'rolled-back'; quotaExceeded: boolean }
  | { status: 'rollback-failed'; quotaExceeded: boolean; failedKeys: string[] }

function isQuotaError(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

function writeValue(storage: RestoreStorage, { key, value }: RestoreValue) {
  if (value === null) storage.removeItem(key)
  else storage.setItem(key, value)
}

export function restoreBackupValues(
  values: readonly RestoreValue[],
  storage?: RestoreStorage,
): BackupRestoreResult {
  let target: RestoreStorage
  let snapshot: RestoreValue[]
  try {
    target = storage ?? localStorage
    // null（存在しない）と空文字を区別し、JSONの解析・再生成はしない。
    snapshot = values.map(({ key }) => ({ key, value: target.getItem(key) }))
  } catch {
    return { status: 'snapshot-failed' }
  }

  try {
    // 退避から全書き込みが終わるまで、同じ画面の別処理を挟まない。
    for (const value of values) writeValue(target, value)
    return { status: 'success' }
  } catch (error) {
    let quotaExceeded = isQuotaError(error)
    const failedKeys: string[] = []
    // 元々存在しなかったキーを先に除き、戻す文字列のための空きを確保する。
    const rollbackValues = [
      ...snapshot.filter(({ value }) => value === null),
      ...snapshot.filter(({ value }) => value !== null),
    ]
    for (const value of rollbackValues) {
      try {
        writeValue(target, value)
      } catch (rollbackError) {
        quotaExceeded ||= isQuotaError(rollbackError)
        failedKeys.push(value.key)
      }
    }
    return failedKeys.length === 0
      ? { status: 'rolled-back', quotaExceeded }
      : { status: 'rollback-failed', quotaExceeded, failedKeys }
  }
}

export function backupRestoreMessage(result: Exclude<BackupRestoreResult, { status: 'success' }>) {
  if (result.status === 'snapshot-failed') {
    return 'ブラウザーの保存データを退避できなかったため、復元を中止しました。保存内容は変更していません。ブラウザーの保存設定を確認してください。'
  }
  const capacityMessage = result.quotaExceeded ? '端末の保存容量が不足している可能性があります。' : ''
  if (result.status === 'rolled-back') {
    return `復元中にブラウザーへデータを保存できなかったため、復元を中止しました。元のデータは維持されています。${capacityMessage}`
  }
  return `復元中に問題が発生し、元のデータを完全には戻せなかった可能性があります。アプリを閉じず、保存済みのバックアップを保管したままにしてください。新しい予定や課題を追加せず、現在の状態でバックアップを書き出して上書きしないでください。${capacityMessage}このメッセージを確認して対処してください。`
}
