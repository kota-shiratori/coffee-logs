/// <reference lib="dom" />

// スマホの写真は 4MB を超えやすいので、送る前に縮小して JPEG にする。
// 文字起こしモデルはフル解像度だとタイムアウトしたので、カードの文字が読める程度に抑える
const MAX_SIDE = 1280;
const LOW_CONFIDENCE = 0.6;

type Extracted = { value: string | string[] | null; confidence: number };
type ExtractResponse = Record<string, Extracted> | { error: string };

// モジュール扱いにして、トップレベル変数がグローバル（window.status 等）と衝突しないようにする
export {};

const input = document.querySelector<HTMLInputElement>("#card-image");
const status = document.querySelector<HTMLParagraphElement>("#status");
const preview = document.querySelector<HTMLImageElement>("#preview");
const form = document.querySelector<HTMLFormElement>("#coffee-form");

input?.addEventListener("change", async () => {
  const file = input.files?.[0];
  if (!file || !status || !preview || !form) return;

  status.textContent = "読み取り中…";
  input.disabled = true;

  try {
    const jpeg = await resize(file);
    // HEIC は <img> で表示できないブラウザがあるので、変換後の JPEG をプレビューする
    URL.revokeObjectURL(preview.src);
    preview.src = URL.createObjectURL(jpeg);
    preview.hidden = false;

    const body = new FormData();
    body.append("image", jpeg, "card.jpg");

    const res = await fetch("/api/extract", { method: "POST", body });
    const data = (await res.json()) as ExtractResponse;
    if ("error" in data) throw new Error(String(data.error));

    fill(form, data);
    status.textContent = "読み取りました。内容を確認してください";
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : "読み取りに失敗しました";
  } finally {
    input.disabled = false;
    input.value = "";
  }
});

function fill(form: HTMLFormElement, data: Record<string, Extracted>) {
  for (const [name, { value, confidence }] of Object.entries(data)) {
    const field = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!field) continue;

    field.value = Array.isArray(value) ? value.join(", ") : (value ?? "");
    // 空でなく自信が低い項目だけ目立たせて、手で直してもらう
    field.closest(".field")?.classList.toggle("low-confidence", field.value !== "" && confidence < LOW_CONFIDENCE);
  }
}

// Safari は HEIC をそのまま開けるので、開けなかったときだけ heic-to（約3MB）を読み込む
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const { isHeic, heicTo } = await import("heic-to");
    if (!(await isHeic(file))) throw new Error("この画像は読み込めません。JPEG / PNG / HEIC を選んでください");
    return heicTo({ blob: file, type: "bitmap" });
  }
}

async function resize(file: File): Promise<Blob> {
  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました"))), "image/jpeg", 0.85);
  });
}
