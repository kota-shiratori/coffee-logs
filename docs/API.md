# API

## `POST /api/extract` — コーヒーカード画像を読み取る

### 何をする？

コーヒーカードの画像を送ると、AI が読み取った項目を JSON で返します。各項目には値と自信度（`confidence`）が付きます。

### 認証

Basic 認証が必要です（アプリ全体にかけています。下の「認証」の節を参照）。認証なしで呼ぶと `401 Unauthorized` が返り、AI は呼ばれません。

### 送るもの

`multipart/form-data`（HTML フォームでファイルを送るときの形式）。

| フィールド | 型 | 必須 | 条件 |
|---|---|---|---|
| `image` | ファイル | ○ | `image/png` / `image/jpeg` / `image/webp`、4MB 以下 |

HEIC はサーバーでは受け付けません。ブラウザ（`client.ts`）が JPEG に変換してから送っています。

### 返ってくるもの（成功: 200）

```json
{
  "country":       { "value": "Nicaragua",              "confidence": 0.95 },
  "farm":          { "value": "Finca El Porvenir",      "confidence": 0.9 },
  "region":        { "value": "Nueva Segovia",          "confidence": 0.88 },
  "process":       { "value": "Natural",                "confidence": 0.92 },
  "variety":       { "value": ["Yellow Pacamara"],      "confidence": 0.85 },
  "tasting_notes": { "value": ["Peach", "Jasmine", "Black Tea"], "confidence": 0.7 },
  "altitude":      { "value": "1,500m",                 "confidence": 0.4 }
}
```

（値は説明用の例です）

| 項目 | `value` の型 | 内容 |
|---|---|---|
| `country` | 文字列 または `null` | 国名 |
| `farm` | 文字列 または `null` | 農園名 |
| `region` | 文字列 または `null` | 地域 |
| `process` | 文字列 または `null` | 精製方法（Washed、Natural など） |
| `variety` | 文字列の配列 | 品種 |
| `tasting_notes` | 文字列の配列 | フレーバー |
| `altitude` | 文字列 または `null` | 標高（`1,800-2,000m` のような幅もそのまま） |

- `confidence` は 0〜1。AI が答えを返さなかった項目は 0 になります。
- カードに書かれていない項目は `null`（配列の項目は `[]`）になります。

### エラー

形式はすべて `{ "error": "メッセージ" }` です。

| ステータス | メッセージ | 原因 |
|---|---|---|
| 400 | 画像が送られていません | `image` がない、またはファイルではない |
| 400 | PNG / JPEG / WebP の画像を選んでください | 形式が対象外 |
| 400 | 画像は 4MB 以下にしてください | サイズ超過 |
| 502 | 読み取りに失敗しました。時間をおいて再度お試しください | AI の呼び出しが失敗した、または文字を読み取れなかった |

### 試してみる

開発サーバー（`pnpm dev`）を起動した状態で：

```bash
curl -u "coffee:<パスワード>" -F "image=@card.jpg;type=image/jpeg" http://localhost:5173/api/extract
```

`-u` は Basic 認証のユーザー名とパスワード（`.dev.vars` に書いたもの）、`-F` はフォーム形式で送るオプション、`@card.jpg` は「このファイルを添付する」という意味です。

## `GET /` — トップページ

アップロードボタンとフォームの HTML を返します。

## `GET /docs/` と `GET /docs/:name` — ドキュメント（例: `/docs/API`）

`docs/*.md` を HTML にして表示します（このページです）。`docs/` に `.md` を追加すると、次のデプロイで一覧に出ます。

## 認証（すべての URL 共通）

`src/index.tsx` の先頭で、すべての URL に Hono の `basicAuth` をかけています。

| 環境 | ユーザー名・パスワードの置き場所 |
|---|---|
| ローカル（`pnpm dev`） | `.dev.vars` の `AUTH_USER` / `AUTH_PASS`（git には含めない） |
| 本番 | `npx wrangler secret put AUTH_USER` / `AUTH_PASS` で登録したシークレット |

`AUTH_USER` か `AUTH_PASS` が未設定のときは、誰でも通れる状態にならないよう `500` を返して止まります。

`/assets/...` の JS・CSS は Workers の静的アセットとして Worker より手前で配信されるため、認証なしで取得できます（秘密の情報は含まれていません）。

_最終更新: 2026-10-25_
