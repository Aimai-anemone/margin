import './App.css'

function App() {
  const today = new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-name">Margin</p>
          <p className="today-date">{today}</p>
        </div>
      </header>

      <main className="main-content">
        <section className="card primary-card">
          <p className="section-label">今日の入口</p>

          <h1 className="card-title">
            まだ決まっていません
          </h1>

          <p className="supporting-text">
            次に迷わないよう、最初の一歩だけを決めます。
          </p>

          <button className="primary-button" type="button">
            入口を決める
          </button>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <p className="section-label">次の課題</p>

              <h2 className="card-title">
                登録された課題はありません
              </h2>
            </div>

            <span className="badge">0件</span>
          </div>

          <p className="supporting-text">
            授業の設定を使って、課題を追加できます。
          </p>

          <button className="secondary-button" type="button">
            課題を追加
          </button>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <p className="section-label">帰宅後</p>

              <h2 className="card-title">
                5分の着手レーン
              </h2>
            </div>

            <span className="badge">5分</span>
          </div>

          <p className="supporting-text">
            SNSや動画を開く前に、最初の行動へ移ります。
          </p>

          <button className="secondary-button" type="button">
            着手レーンを準備する
          </button>
        </section>

        <section className="closing-section">
          <div>
            <p className="section-label">一日の終わり</p>

            <h2 className="closing-title">
              今日はまだ記録していません
            </h2>
          </div>

          <button className="text-button" type="button">
            夜の観察を始める
          </button>
        </section>
      </main>

      <nav className="bottom-navigation">
        <button className="nav-item active" type="button">
          <span className="nav-symbol">●</span>
          <span>今日</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">□</span>
          <span>課題</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">△</span>
          <span>素描室</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">◇</span>
          <span>記録</span>
        </button>

        <button className="nav-item" type="button">
          <span className="nav-symbol">○</span>
          <span>設定</span>
        </button>
      </nav>
    </div>
  )
}

export default App