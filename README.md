# Coffee Log

## これは何？

コーヒー豆についてくる「コーヒーカード」をスマホで撮ると、AI が国名・農園名・品種・フレーバーなどを読み取って、フォームに自動で入れてくれる Web アプリです。

読み取りに自信がない項目はオレンジ色の枠で表示されるので、そこだけ手で直せば OK、という使い方を想定しています。

> 現時点では「読み取ってフォームに表示する」までです。入力内容を保存する機能はまだありません。

## 5分で動かす

前提：Node.js と [pnpm](https://pnpm.io/ja/) が入っていること、Cloudflare のアカウントがあること。

```bash
pnpm install        # 依存パッケージをインストール
pnpm wrangler login # 初回だけ。Cloudflare にログイン（AI を呼ぶのに必要）
pnpm dev            # 開発サーバーを起動
```

表示された URL（例: `http://localhost:5173`）をブラウザで開き、「コーヒーカードを読み込む」から画像を選んでください。

> **注意:** AI の処理（Workers AI）はローカルで動くのではなく、開発中でも Cloudflare 上で実行されます。使った分は自分の Cloudflare アカウントの利用量になります。

### その他のコマンド

| コマンド | 何をする？ |
|---|---|
| `pnpm dev` | 開発サーバーを起動。ファイルを保存すると自動で反映される |
| `pnpm build` | 本番用にビルドして `dist/` に出力 |
| `pnpm preview` | ビルドした本番版をローカルで確認 |
| `pnpm deploy` | ビルドして Cloudflare Workers に公開 |

## フォルダ構成

```
coffee-log/
├── src/
│   ├── index.tsx        # サーバーの入口。URL ごとの処理（ページ表示・API）を決める
│   ├── renderer.tsx     # 全ページ共通の HTML の枠（<head> など）
│   ├── coffee-card.ts   # AI を呼んでカード画像から項目を取り出す（このアプリの心臓部）
│   ├── client.ts        # ブラウザで動く JS。画像の縮小・送信・フォームへの入力
│   └── style.css        # 見た目
├── public/              # そのまま配信するファイル（favicon）
├── wrangler.jsonc       # Cloudflare Workers の設定（AI を使う宣言もここ）
├── vite.config.ts       # 開発サーバー／ビルドツール Vite の設定
├── tsconfig.json        # TypeScript の設定
├── worker-configuration.d.ts  # wrangler が自動生成した型定義（手で編集しない）
└── package.json         # 依存パッケージとコマンド
```

## もっと知りたい人へ

| ドキュメント | 内容 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 全体の仕組み、データの流れ、設計の理由 |
| [docs/API.md](docs/API.md) | `/api/extract` の仕様（送るもの・返ってくるもの） |
| [docs/LEARNING.md](docs/LEARNING.md) | このコードを理解するために学ぶこと（学習ロードマップ） |

## 困ったとき

| 症状 | 原因と対処 |
|---|---|
| 「読み取りに失敗しました。時間をおいて再度お試しください」 | AI の呼び出しでエラー。`pnpm wrangler login` 済みか確認。ターミナルに `clairic extraction failed` のログが出ているはず |
| 「この画像は読み込めません」 | ブラウザが開けない形式。JPEG / PNG / HEIC を使う |
| `pnpm cf-typegen` の後に型エラーが出る | このスクリプトは型名を `CloudflareBindings` で生成するが、コードは `Env` を使っている。`pnpm wrangler types`（オプションなし）で作り直すか、`src/index.tsx` 側を合わせる |

_最終更新: 2026-10-25_
