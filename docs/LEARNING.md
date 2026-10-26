# 学習ガイド

このプロジェクトのコードを「全部わかる」状態になるために学ぶことを、順番に並べました。各ステップに「このプロジェクトのどこで使われているか」を付けているので、学んだらすぐ実物のコードで確認してください。

## 全体マップ

```
Step 1  Web の基本（HTML / CSS / HTTP）
  ↓
Step 2  JavaScript と TypeScript
  ↓
Step 3  ブラウザの JS（DOM・イベント・fetch）    → client.ts を読める
  ↓
Step 4  サーバーと Hono・JSX                  → index.tsx / renderer.tsx を読める
  ↓
Step 5  Cloudflare Workers と開発ツール         → 設定ファイルを読める
  ↓
Step 6  Workers AI と AI の使い方               → coffee-card.ts を読める
```

---

## Step 1: Web の基本

| 学ぶこと | このプロジェクトでは |
|---|---|
| HTML のタグ、フォーム（`<form>` `<input>` `<label>`） | `index.tsx` の画面部分 |
| `<input type="file" accept="image/*" capture="environment">` | スマホでカメラを起動するための指定 |
| CSS のセレクタ、`display: grid`、`class` の付け外し | `style.css`、`.low-confidence` |
| HTTP の基本：GET と POST、ステータスコード（200 / 400 / 502）、JSON | `/api/extract` のエラー処理 |
| アクセシビリティ入門（`aria-live`） | `#status` の変化を読み上げソフトに伝える |

**おすすめ:** [MDN Web Docs](https://developer.mozilla.org/ja/docs/Learn)（日本語あり）

## Step 2: JavaScript と TypeScript

| 学ぶこと | このプロジェクトでは |
|---|---|
| 変数・関数・アロー関数 `(x) => ...` | ほぼ全ファイル |
| 配列メソッド `map` / `filter` / `split` / `join` | `list()`、`FIELDS.map(...)` |
| オブジェクト、分割代入 `const { answers } = ...` | `extractCoffeeCard()` |
| `??`（null のときの代わりの値）と `?.`（null なら止める） | `answer?.value ?? ""` |
| テンプレート文字列 `` `...${x}` `` | `fromLine()` |
| 正規表現 `/[,、]/` | `list()` の区切り、`normalizeCase()` |
| **非同期処理**：`Promise`、`async / await`、`try / catch / finally` | `client.ts` の流れ全体 |
| モジュール：`import` / `export`、動的 `import()` | `heic-to` を必要なときだけ読み込む |
| TypeScript の型：`type`、ユニオン型 `string \| null`、ジェネリクス `Extracted<T>` | `coffee-card.ts` の型定義 |
| 少し発展：`keyof typeof`、`as const`、型アサーション `as` | `CoffeeCardField`、`FIELDS` |

**おすすめ:** [JavaScript Primer](https://jsprimer.net/)（日本語・無料）→ [サバイバル TypeScript](https://typescriptbook.jp/)（日本語・無料）

## Step 3: ブラウザの JavaScript

| 学ぶこと | このプロジェクトでは |
|---|---|
| DOM 操作：`querySelector`、`textContent`、`hidden`、`classList.toggle` | `client.ts` の冒頭と `fill()` |
| イベント：`addEventListener("change", ...)` | 写真を選んだ瞬間に処理開始 |
| `fetch` と `FormData` でファイルを送る | `/api/extract` への送信 |
| `File` / `Blob` / `URL.createObjectURL` | プレビュー表示 |
| `<canvas>` で画像を描いて変換する | `resize()` |

**確認問題:** `finally` の中で `input.value = ""` しているのはなぜ？（ヒント：同じ写真をもう一度選んだとき `change` は起きる？）

## Step 4: サーバーと Hono・JSX

| 学ぶこと | このプロジェクトでは |
|---|---|
| 「サーバー」と「クライアント」の違い（どこでコードが動くか） | `index.tsx` はサーバー、`client.ts` はブラウザ |
| ルーティング：`app.get("/")`、`app.post("/api/extract")` | `index.tsx` |
| コンテキスト `c`：`c.req.parseBody()`、`c.json()`、`c.render()`、`c.env` | `index.tsx` |
| ミドルウェア：`app.use(...)` | `app.use(renderer)`、Basic 認証の `basicAuth` |
| JSX：`{}` で式を埋め込む、`map` で繰り返し、`&&` で条件表示 | フォームの生成 |
| SSR（サーバーで HTML を作って返す）とは何か | `renderer.tsx` |
| 入力チェック（バリデーション）をサーバーでもやる理由 | 形式・サイズのチェック |

**おすすめ:** [Hono 公式ドキュメント](https://hono.dev/docs/)（Getting Started → Cloudflare Workers）

## Step 5: Cloudflare Workers と開発ツール

| 学ぶこと | このプロジェクトでは |
|---|---|
| Node.js と pnpm（パッケージ管理、`package.json` の `scripts`） | `pnpm dev` など |
| Vite（開発サーバーとビルド） | `vite.config.ts` |
| Cloudflare Workers とは（サーバーレス、エッジ） | アプリ全体の動く場所 |
| Wrangler と `wrangler.jsonc`、**バインディング**（`c.env.AI` の正体） | `"ai": { "binding": "AI" }` |
| `wrangler types` による型の自動生成 | `worker-configuration.d.ts` |
| デプロイ（`pnpm deploy` は pnpm 自身の別コマンドなので `run` が必要） | `pnpm run deploy` |

**おすすめ:** [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)

## Step 6: Workers AI と AI の使い方

| 学ぶこと | このプロジェクトでは |
|---|---|
| Workers AI の呼び出し方 `ai.run(モデル名, 入力)` | `transcribe()`、`extractCoffeeCard()` |
| 画像を AI に渡す方法（Base64 / data URL） | `toBase64()`、`data:image/jpeg;base64,...` |
| プロンプトの書き方（出力形式を決める、ヒントを与える） | `OCR_PROMPT` |
| 構造化抽出（項目ごとに値を取り出す）と自信度 | Clairic と `FIELDS` |
| AI の出力は間違えることを前提に設計する | 2段階構成、`null` ルール、低自信度の強調表示 |

**おすすめ:** [Workers AI ドキュメント](https://developers.cloudflare.com/workers-ai/)、[Clairic のモデルページ](https://developers.cloudflare.com/workers-ai/models/clairic/)

---

## 練習課題（やさしい順）

1. **見た目を変える**：`style.css` のボタンの色を変えて `pnpm dev` で確認する。
2. **しきい値を変える**：`client.ts` の `LOW_CONFIDENCE` を 0.8 にして、オレンジになる項目が増えるか見る。
3. **ブラウザの開発者ツールを使う**：Network タブで `/api/extract` のリクエストとレスポンス JSON を見る。
4. **`curl` で API を叩く**：[API.md](API.md) の例を試し、わざと 4MB 超の画像を送って 400 を確認する。
5. **項目を1つ追加する**：例えば「焙煎度（Roast）」。[ARCHITECTURE.md](ARCHITECTURE.md) の「機能を足すときの入口」の5か所を変更する。
6. **保存機能を作る**：Cloudflare D1 を使い、フォームの内容を保存・一覧表示する。ここまでできれば、ひとつの Web アプリを最初から最後まで作れる力が付いています。

_最終更新: 2026-10-25_
