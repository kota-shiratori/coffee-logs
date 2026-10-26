// コーヒーカード画像から項目を抽出する
//
// Clairic に画像を直接渡すと文字の書き出しが崩れやすい（"NICAR" "PorvenirvenirIR" など）ので、
// 1. Vision モデルでカードを読み、決まった見出し（Country: / Variety: …）の行に整理して書き出す
// 2. その文字列を Clairic の state として渡して項目を抽出する
// 2段階にしている。Clairic のテキスト回答は state の部分文字列になるので表記が崩れない。
//
// カードはレイアウトがばらばらで、見出しのない値（"Yellow Pacamara / Natural" や
// 見出しなしのフレーバー一覧）も多い。ただの文字起こしだと Clairic が項目を取り違えたので、
// 見出しの割り当ては 1 の Vision モデルに任せている。
// https://developers.cloudflare.com/workers-ai/models/clairic/

// Llama 4 Scout は 70〜140 秒待たされて失敗することが多かったので Mistral Small を使う（2〜5 秒）
const OCR_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
const EXTRACT_MODEL = "@cf/cloudflare/clairic";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const OCR_PROMPT = `Read this coffee bean card and rewrite its information as labeled lines, copying each value exactly as printed (same spelling and language). Use only these labels, one per line, and omit a label if the card does not show it:
Country:
Farm:
Region:
Process:
Variety:
Tasting notes:
Altitude:
Other:
Hints: a farm name often starts with "Finca", "Hacienda" or "El"; flavor words (fruits, flowers, tea, wine, etc.) are tasting notes even without a heading; "Variety / Process" is often written together like "Yellow Pacamara / Natural". Put everything else (producer, scores, shop names, cupping scales) under Other.
Separate multiple values on one line with ", ".
Output only the lines.`;

// 見出しの行がないときに別の行から推測させない（Region に農園名が入るなどを防ぐ）
const fromLine = (label: string) => `The value on the "${label}:" line, copied exactly. Null if there is no such line.`;

// Clairic の list 型は断片（"CO" "H" など）が混ざったので、
// 複数値の項目もテキストで受けてから分割する
const FIELDS = {
  country: { type: "text", instructions: fromLine("Country") },
  farm: { type: "text", instructions: fromLine("Farm") },
  region: { type: "text", instructions: fromLine("Region") },
  process: { type: "text", instructions: fromLine("Process") },
  variety: { type: "text", instructions: fromLine("Variety") },
  tasting_notes: { type: "text", instructions: fromLine("Tasting notes") },
  // "1,800-2,000m" のような幅表記が多いので数値ではなくテキストで受ける
  altitude: { type: "text", instructions: fromLine("Altitude") },
} as const;

type CoffeeCardField = keyof typeof FIELDS;

type ClairicAnswer = {
  value: string | null;
  confidence?: number;
};

type ClairicResponse = {
  answers: Record<CoffeeCardField, ClairicAnswer>;
};

export type Extracted<T> = { value: T; confidence: number };

export type CoffeeCard = {
  country: Extracted<string | null>;
  farm: Extracted<string | null>;
  region: Extracted<string | null>;
  process: Extracted<string | null>;
  variety: Extracted<string[]>;
  tasting_notes: Extracted<string[]>;
  altitude: Extracted<string | null>;
};

export async function extractCoffeeCard(ai: Ai, image: File): Promise<CoffeeCard> {
  const transcript = await transcribe(ai, image);

  const { answers } = (await ai.run(EXTRACT_MODEL, {
    model: "clairic",
    state: transcript,
    fields: FIELDS,
  })) as ClairicResponse;

  return {
    country: text(answers.country),
    farm: text(answers.farm),
    region: text(answers.region),
    process: text(answers.process),
    variety: list(answers.variety, /[,、，/&]/),
    tasting_notes: list(answers.tasting_notes, /[,、，/\n]/),
    altitude: text(answers.altitude),
  };
}

async function transcribe(ai: Ai, image: File): Promise<string> {
  const base64 = toBase64(new Uint8Array(await image.arrayBuffer()));

  const { response } = (await ai.run(OCR_MODEL, {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: `data:${image.type};base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 800,
  } as Ai_Cf_Mistralai_Mistral_Small_3_1_24B_Instruct_Input)) as { response?: string };

  if (!response?.trim()) throw new Error("カードの文字を読み取れませんでした");
  return response;
}

function text(answer: ClairicAnswer | undefined): Extracted<string | null> {
  const value = answer?.value?.trim();
  return { value: value ? normalizeCase(value) : null, confidence: answer?.confidence ?? 0 };
}

function list(answer: ClairicAnswer | undefined, separator: RegExp): Extracted<string[]> {
  const value = (answer?.value ?? "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeCase);
  return { value, confidence: answer?.confidence ?? 0 };
}

// カードは全部大文字で書かれていることが多いので "NUEVA SEGOVIA" → "Nueva Segovia" に揃える。
// 小文字を含む表記や日本語、"SL-09" のような数字入りの型番はそのまま残す
function normalizeCase(value: string): string {
  if (!/[A-Z]/.test(value) || /[a-z]/.test(value)) return value;
  return value.replace(/\S+/g, (word) =>
    /\d/.test(word) ? word : word.toLowerCase().replace(/(^|[-(])([a-z])/g, (_, head, char) => head + char.toUpperCase())
  );
}

// 大きな配列で String.fromCharCode(...bytes) するとスタックが溢れるので分割する
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
