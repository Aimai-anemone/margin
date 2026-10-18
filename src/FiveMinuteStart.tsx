import { useState } from 'react'
import { loadTasks, sortTasks } from './TaskStorage'
import { type FiveMinuteController } from './useFiveMinuteStart'

type Props = { controller: FiveMinuteController; onBack: () => void }

function deadlineText(deadline: string) {
  if (!deadline) return ''
  const date = new Date(deadline)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function FiveMinuteStart({ controller, onBack }: Props) {
  const [tasks] = useState(() => sortTasks(loadTasks().filter((task) => !task.completed)))
  const [method, setMethod] = useState<'task' | 'free'>('task')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [freeContent, setFreeContent] = useState('')
  const [confirmingStop, setConfirmingStop] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const timer = controller.state.activeTimer
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  const content = method === 'task' ? selectedTask?.title.trim() ?? '' : freeContent.trim()
  const remaining = controller.remainingSeconds
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`

  async function start() {
    setIsSaving(true)
    await controller.start(content, method === 'task' ? selectedTask?.id : undefined)
    setIsSaving(false)
  }

  async function stop() {
    if (!timer) return
    setIsSaving(true)
    const next = await controller.cancel(timer.id)
    setIsSaving(false)
    setConfirmingStop(false)
    if (next?.activeTimer === null) onBack()
  }

  async function finish() {
    if (!timer) return
    setIsSaving(true)
    const next = await controller.finish(timer.id)
    setIsSaving(false)
    if (next?.activeTimer === null) onBack()
  }

  return (
    <div className="five-minute-page">
      <header className="five-minute-heading">
        <button className="cancel-button" type="button" onClick={onBack}>今日へ戻る</button>
        <h1 className="card-title">5分の着手レーン</h1>
      </header>

      {controller.error && (
        <div className="card five-minute-message" role="alert">
          <p>{controller.error}</p>
          <button className="cancel-button" type="button" onClick={() => { void controller.refresh() }}>もう一度確認する</button>
        </div>
      )}
      {controller.notice && <p className="supporting-text" role="status">{controller.notice}</p>}

      {timer ? (
        <section className="card five-minute-session">
          {timer.counted ? (
            <>
              <h2 className="card-title" role="status">5分が終わりました</h2>
              <p className="supporting-text">始められたことを、そのまま次につなげられます。</p>
              <p className="five-minute-content">{timer.content}</p>
              <p className="five-minute-clock" role="timer" aria-label="残り時間 0分0秒">0:00</p>
              <button className="primary-button" type="button" disabled={isSaving || !!controller.error} onClick={finish}>そのまま続ける</button>
              <button className="secondary-button" type="button" disabled={isSaving || !!controller.error} onClick={finish}>ここまでにする</button>
            </>
          ) : (
            <>
              <p className="section-label">まず、最初の5分だけ</p>
              <h2 className="five-minute-content">{timer.content}</h2>
              <p className="five-minute-clock" role="timer" aria-live="off"
                aria-label={`残り時間 ${Math.floor(remaining / 60)}分${remaining % 60}秒`}>{clock}</p>
              {confirmingStop ? (
                <div className="five-minute-stop-confirm" role="group" aria-labelledby="five-minute-stop-label">
                  <p id="five-minute-stop-label">今回の5分を終了しますか？</p>
                  <button className="secondary-button" type="button" disabled={isSaving || !!controller.error} onClick={stop}>終了する</button>
                  <button className="cancel-button" type="button" onClick={() => setConfirmingStop(false)}>続ける</button>
                </div>
              ) : (
                <button className="cancel-button" type="button" onClick={() => setConfirmingStop(true)}>今回はやめる</button>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="card five-minute-setup">
          <p className="supporting-text">完了を目指さず、最初の5分だけ始めます。</p>
          <div className="five-minute-methods" role="group" aria-label="取り組む内容の決め方">
            <button type="button" className={`five-minute-method${method === 'task' ? ' selected' : ''}`}
              aria-pressed={method === 'task'} onClick={() => setMethod('task')}>未完了課題</button>
            <button type="button" className={`five-minute-method${method === 'free' ? ' selected' : ''}`}
              aria-pressed={method === 'free'} onClick={() => setMethod('free')}>自由入力</button>
          </div>

          {method === 'task' ? (
            tasks.length === 0 ? (
              <p className="supporting-text">選べる未完了課題はありません。自由入力から始めることもできます。</p>
            ) : (
              <div className="five-minute-tasks" role="group" aria-label="取り組む課題を選ぶ">
                {tasks.map((task) => (
                  <button type="button" key={task.id}
                    className={`five-minute-task${selectedTaskId === task.id ? ' selected' : ''}`}
                    aria-pressed={selectedTaskId === task.id} onClick={() => setSelectedTaskId(task.id)}>
                    <span>{selectedTaskId === task.id ? '✓ ' : ''}{task.title}</span>
                    {deadlineText(task.deadline) && <span className="five-minute-deadline">締切：{deadlineText(task.deadline)}</span>}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="form-field">
              <label className="input-label" htmlFor="five-minute-content">5分で始めること</label>
              <p className="supporting-text" id="five-minute-input-help">最初にする小さな行動を書いてください。</p>
              <textarea id="five-minute-content" className="entry-input" rows={3}
                aria-describedby="five-minute-input-help" value={freeContent}
                onChange={(event) => setFreeContent(event.target.value)} placeholder="例：レポートのファイルを開く" />
            </div>
          )}

          <div className="five-minute-preview">
            <p className="section-label">今回、始めること</p>
            <p className="five-minute-content">{content || '内容を選択または入力してください。'}</p>
          </div>
          <button className="primary-button" type="button" onClick={start}
            disabled={!content || isSaving || !!controller.error} aria-describedby="five-minute-start-help">5分を始める</button>
          <p className="supporting-text" id="five-minute-start-help">{content
            ? '完了を目指さず、まず5分だけ始めます。' : '内容が決まると、5分を始められます。'}</p>
        </section>
      )}
    </div>
  )
}

export default FiveMinuteStart
