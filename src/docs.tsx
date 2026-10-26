import { Hono } from "hono";
import { raw } from "hono/html";
import { Marked } from "marked";
import { Script } from "vite-ssr-components/hono";

// docs/*.md をビルド時に文字列として取り込む。ファイルを足せば自動で一覧に出る
const files = import.meta.glob<string>("../docs/*.md", { query: "?raw", import: "default", eager: true });

const pages = Object.entries(files)
  .map(([path, markdown]) => ({
    // URL は .md なしにする（/docs/API.md だと開発中は Vite が md ファイルをそのまま返してしまう）
    name: path.split("/").pop()!.replace(/\.md$/, ""),
    title: markdown.match(/^#\s+(.+)$/m)?.[1] ?? path,
    markdown,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const marked = new Marked({
  gfm: true,
  // md 同士の相対リンク（[API.md](API.md)）を /docs/API に合わせる
  walkTokens(token) {
    if (token.type === "link" && !/^[a-z]+:/i.test(token.href)) {
      token.href = token.href.replace(/\.md(?=$|#)/, "");
    }
  },
});

export const docs = new Hono<{ Bindings: Env }>();

// 一覧ページのリンク（href="API"）が /docs/API を指すよう、末尾スラッシュ付きに揃える
docs.get("/docs", (c) => c.redirect("/docs/"));

docs.get("/docs/", (c) => {
  return c.render(
    <main class="docs">
      <p>
        <a href="/">← Coffee Log</a>
      </p>
      <h1>ドキュメント</h1>
      <ul>
        {pages.map((page) => (
          <li>
            <a href={page.name}>{page.title}</a> <small>{page.name}.md</small>
          </li>
        ))}
      </ul>
    </main>
  );
});

docs.get("/docs/:name", async (c) => {
  const page = pages.find((p) => p.name === c.req.param("name"));
  if (!page) return c.notFound();

  // 自分で書いた docs だけを表示するので、HTML のサニタイズはしていない
  const html = await marked.parse(page.markdown);
  return c.render(
    <main class="docs">
      <p>
        <a href="/docs/">← ドキュメント一覧</a>
      </p>
      <article>{raw(html)}</article>
      <Script src="/src/docs-client.ts" />
    </main>
  );
});
