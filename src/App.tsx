function App() {
  return (
    <main>
      <header>
        <h1>Margin</h1>
        <p>今日</p>
      </header>

      <section>
        <h2>今日の入口</h2>
        <p>まだ決まっていません</p>
        <button type="button">
          入口を決める
        </button>
      </section>

      <section>
        <h2>次の課題</h2>
        <p>登録された課題はありません</p>
        <button type="button">
          課題を追加
        </button>
      </section>

      <section>
        <h2>5分の着手レーン</h2>
        <p>帰宅後の最初の行動を準備します。</p>
        <button type="button">
          着手レーンを準備する
        </button>
      </section>

      <section>
        <h2>一日の終わり</h2>
        <p>今日はまだ記録していません</p>
        <button type="button">
          夜の観察を始める
        </button>
      </section>

      <nav>
        <button type="button">今日</button>
        <button type="button">課題</button>
        <button type="button">素描室</button>
        <button type="button">記録</button>
        <button type="button">設定</button>
      </nav>
    </main>
  )
}

export default App