# 情景画像の開発用ツール

アプリの起動・ビルド・自動テストには、Gitに含めた `public/scenery/` の加工済みWebP30枚だけを使用します。
PNG原本、旧36px／40px素材、個人の記録やバックアップは不要です。

## 一覧で確認

`npm run dev` を起動し、`http://localhost:5173/margin/dev/scenery.html` を開きます。
この一覧と開発用スクリプトは、本番ビルドには含まれません。

## 自動確認

Node.js 24で次を実行します。

```text
node --test src/TodayAtmosphere.test.mjs
npm run lint
npm run build
node dev/check_scenery_build.mjs
```

原本フォルダーがない環境でも確認できます。原本がある場合のみ、原本と加工後のファイル名も照合します。

## 原本から再加工する場合だけ

PNG原本はGitに含めません。別途保管した30枚を、プロジェクト直下の `scenery-originals/` に戻してください。
Pillowを利用できるPython環境で `python dev/prepare_scenery.py` を実行します。
切り出し位置はスクリプト内に画像別で指定しています。原本は変更せず、加工済みWebPだけを更新します。
PythonとPillowはアプリの実行・ビルドには必要ありません。
