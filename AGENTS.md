# Margin 開発ガイド

## プロジェクト概要

Marginは、個人利用のiPhone向けPWA課題管理アプリです。

利用者はプログラミング初心者です。
変更内容と確認方法を、専門用語を抑えて一工程ずつ説明してください。

## 開発環境

- Windows 11
- VS Code
- Node.js / npm
- Git
- React
- TypeScript
- Vite
- vite-plugin-pwa
- プロジェクト場所: C:\Users\shant\margin
- 開発起動: npm run dev
- ローカルURL: http://localhost:5173/
- 本番ビルド: npm run build
- 静的解析: npm run lint
- 公開先: GitHub Pages
- 公開パス: /margin/

## アプリの方針

- アプリ名はMargin
- 静かでシンプル、少し温かみのあるUI
- 個人利用
- 外部AIなし
- アカウントなし
- データはlocalStorageに保存
- Windowsだけで開発
- iPhone 13で使用
- GitHub PagesへPWAとして公開
- オフライン利用に対応

## 完成済み機能

### 今日の入口

- 登録
- 変更
- 削除
- localStorage保存

### 課題管理

- 複数課題登録
- 締切順表示
- 課題詳細
- 編集
- 削除確認
- 完了状態
- 完了済み一覧
- 未完了へ戻す
- 再読み込み後の状態保持

### 授業テンプレート

- 登録
- 編集
- 削除確認
- 曜日と時限
- 標準の課題形式
- 標準の最初の入口
- 課題追加フォームへの自動反映

### データ保護

- JSONバックアップの書き出し
- JSONからの復元
- 復元前の確認
- 不正なバックアップファイルの拒否

### PWA・公開

- Web App Manifest
- Service Worker
- オフライン起動
- PWAアイコン
- GitHub Pages
- GitHub Actionsによる自動公開
- iPhoneホーム画面からの起動

## localStorageキー

- margin-entry
- margin-tasks
- margin-courses

既存キーの名前は、移行処理なしに変更しないでください。

## 主なファイル

- src/App.tsx
- src/App.css
- src/index.css
- src/TaskList.tsx
- src/TaskCard.tsx
- src/CourseTemplates.tsx
- src/DataBackup.tsx
- vite.config.ts
- index.html
- .github/workflows/deploy.yml

## 重要な作業ルール

- 既存機能を壊さない
- 変更は1機能ずつ小さく行う
- 長いファイルを理由なく全面置換しない
- 変更前に関連コードを読む
- 変更したファイルと理由を説明する
- localStorageの既存データとの互換性を維持する
- 危険なGitコマンドを実行しない
- git reset --hardを実行しない
- git push --forceを実行しない
- mainブランチへ直接作業しない
- ユーザーの課題内容やバックアップJSONをGitへ追加しない
- 外部サービス、分析、広告、AI、認証を勝手に追加しない
- 新しいnpmパッケージは、必要性を説明してから追加する
- 有料サービスを追加しない
- 秘密情報、APIキー、トークンをコードに保存しない

## コーディングルール

- TypeScriptを使用する
- Reactの既存設計に合わせる
- コンポーネントはPascalCase
- 変数と関数はcamelCase
- インデントは既存ファイルに合わせる
- 動的プロパティは `[field\]: value` と書く
- React上で利用者の入力を表示する際に dangerouslySetInnerHTMLを使わない
- 不明な型を安易にanyへ変更しない

## UIルール

- 静かでシンプルな見た目を維持する
- 少し温かみのある配色を維持する
- iPhone 13幅を優先する
- 画面の横方向へのはみ出しを防ぐ
- 下部ナビゲーションと内容を重ねない
- ボタンや入力欄のタップ領域を確保する
- 既存クラスへの影響を避け、必要なら専用クラスを使う

## 作業後の必須確認

変更後は次を実行してください。

1. npm run lint
2. npm run build
3. git diffの確認
4. 変更した機能の動作確認項目を提示

lintまたはbuildが失敗した場合は、成功するまでコミットしないでください。

## Gitルール

- 正式完成版タグ: v1.0.0
- 公開ブランチ: main
- Codex作業用ブランチ: codex-development
- コミット前にgit statusを確認する
- ユーザーが確認する前に勝手にpushしない
- コミットメッセージは日本語で簡潔にする

## 回答方法

利用者はプログラミング初心者です。

作業結果を説明するときは、次を含めてください。

- 何を変更したか
- 変更したファイル
- 変更理由
- 動作確認方法
- 既存データへの影響
- lintとbuildの結果
- 次にユーザーが行う操作

大きな変更を一度に実行せず、必要に応じて調査、実装、確認に分けてください。