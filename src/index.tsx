import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { renderer } from "./renderer";
import { ACCEPTED_TYPES, MAX_IMAGE_BYTES, extractCoffeeCard } from "./coffee-card";
import { docs } from "./docs";

const app = new Hono<{ Bindings: Env }>();

// 自分専用なのでアプリ全体を Basic 認証で守る（AI の呼び出しに無料枠・料金がかかるため）
app.use("*", async (c, next) => {
  const { AUTH_USER, AUTH_PASS } = c.env;
  // シークレットの登録漏れで誰でも通れる状態にならないよう、未設定なら止める
  if (!AUTH_USER || !AUTH_PASS) {
    return c.text("AUTH_USER / AUTH_PASS が設定されていません", 500);
  }
  return basicAuth({ username: AUTH_USER, password: AUTH_PASS })(c, next);
});

app.use(renderer);

const FIELDS = [
  { name: "country", label: "国名" },
  { name: "farm", label: "農園名" },
  { name: "region", label: "Region" },
  { name: "process", label: "プロセス" },
  { name: "variety", label: "Variety（品種）", hint: "カンマ区切り" },
  { name: "tasting_notes", label: "Tasting Note", hint: "カンマ区切り" },
  { name: "altitude", label: "標高" },
];

app.get("/", (c) => {
  return c.render(
    <main>
      <header class="site-header">
        <h1>Coffee Log</h1>
        <a href="/docs/">ドキュメント</a>
      </header>

      <section class="upload">
        <label class="upload-button">
          コーヒーカードを読み込む
          <input id="card-image" type="file" accept="image/*" capture="environment" hidden />
        </label>
        <p id="status" class="status" aria-live="polite"></p>
        <img id="preview" class="preview" alt="" hidden />
      </section>

      <form id="coffee-form" class="coffee-form">
        {FIELDS.map((field) => (
          <label class="field" data-field={field.name}>
            <span>
              {field.label}
              {field.hint && <small>（{field.hint}）</small>}
            </span>
            <input name={field.name} type="text" autocomplete="off" />
          </label>
        ))}
      </form>
    </main>
  );
});

app.post("/api/extract", async (c) => {
  const body = await c.req.parseBody();
  const image = body.image;

  if (!(image instanceof File)) {
    return c.json({ error: "画像が送られていません" }, 400);
  }
  if (!ACCEPTED_TYPES.includes(image.type)) {
    return c.json({ error: "PNG / JPEG / WebP の画像を選んでください" }, 400);
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return c.json({ error: "画像は 4MB 以下にしてください" }, 400);
  }

  try {
    return c.json(await extractCoffeeCard(c.env.AI, image));
  } catch (err) {
    console.error("clairic extraction failed", err);
    return c.json({ error: "読み取りに失敗しました。時間をおいて再度お試しください" }, 502);
  }
});

app.route("/", docs);

export default app;
