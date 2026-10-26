/// <reference lib="dom" />

// ```mermaid のコードブロックを図にする。mermaid は大きいので図があるページでだけ読み込む
async function renderMermaid(blocks: HTMLElement[]) {
  const { default: mermaid } = await import("mermaid");
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default" });

  const nodes = blocks.map((code) => {
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = code.textContent;
    code.parentElement!.replaceWith(div);
    return div;
  });
  await mermaid.run({ nodes });
}

const blocks = Array.from(document.querySelectorAll<HTMLElement>("pre > code.language-mermaid"));
if (blocks.length > 0) void renderMermaid(blocks);

export {};
