/**
 * Prompt + constants shared between the API route and tests.
 * Keeping this in one place makes it easy to tweak voice/behavior later.
 */

/** Maximum input length, in characters. Enforced on both client and server. */
export const POLISH_MAX_CHARS = 500;

/** Daily request quota per IP. */
export const POLISH_DAILY_LIMIT = 10;

/** Gemini model used for polishing. */
// gemini-2.5-flash-lite is the cheapest stable model that supports
// generateContent in the current AI Studio free tier. It's fast, small,
// and more than enough for a single-sentence grammar/spelling pass.
// (gemini-1.5-flash was retired; gemini-2.0-flash often has 0 free quota.)
export const POLISH_MODEL = "gemini-2.5-flash-lite";

/**
 * System instruction for the polishing task.
 * Written in Mongolian so the model stays in-domain.
 *
 * Key design choices:
 * - Tell the model what to do, but also what NOT to do (translate, explain, add).
 * - Force structured JSON output so we can render side-by-side diff + per-change explanations.
 * - Make it explicit that the meaning must be preserved.
 */
export const POLISH_SYSTEM_PROMPT = `Та бол монгол хэлний редактор. Хэрэглэгчийн бичсэн кирилл монгол текстийг засаж, дараах зүйлсийг хийнэ:

- Үсгийн алдаа, нэр томьёоны алдаа засах
- Хэлзүйн алдаа (нөхцөл, дагавар, үгийн дараалал) засах
- Богино/ярианы хэлбэрийг бичгийн хэв маяг руу хөрвүүлэх (жишээ нь "бн" → "байна")
- Уг утгыг өөрчилөхгүй

Та дараах зүйлсийг ХИЙХГҮЙ:
- Өөр хэл рүү орчуулахгүй
- Шинэ агуулга нэмэхгүй
- Хэв маяг (албан/ярианы) бүхэлдээ өөрчилөхгүй

ХАРИУЛТЫН ФОРМАТ:
JSON объект буцаах ёстой. Дараах талбартай:
- "polished": засагдсан бүх текст (string)
- "changes": массив, тус бүр {"before": "анхны үг/хэллэг", "after": "засагдсан үг/хэллэг", "reason": "1 өгүүлбэрээр шалтгаан"} объекттой

Хэрэв засвар хийх шаардлагагүй бол "polished" талбарт оригинал текстийг хадгалж, "changes" массивыг хоосон үлдээ.`;

/**
 * Build the user-facing prompt. The input is fenced with triple quotes so
 * any instructions inside it are clearly data, not commands. This is a
 * lightweight prompt-injection mitigation — not bulletproof, but it makes
 * the boundary explicit to the model.
 */
export function buildPolishUserPrompt(text: string): string {
  return `Дараах текстийг засаад JSON хэлбэрээр буцаа:\n"""\n${text}\n"""`;
}

/**
 * Structured response schema for Gemini's responseSchema feature.
 * Forces the model into a predictable JSON shape we can parse with no fallbacks.
 */
export const POLISH_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    polished: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          before: { type: "string" },
          after: { type: "string" },
          reason: { type: "string" },
        },
        required: ["before", "after", "reason"],
      },
    },
  },
  required: ["polished", "changes"],
} as const;

/** Parsed change record returned from the API. */
export type PolishChange = {
  before: string;
  after: string;
  reason: string;
};

/** Full parsed Gemini response. */
export type PolishResult = {
  polished: string;
  changes: PolishChange[];
};

/**
 * Strip common wrappers the model sometimes adds even when told not to:
 * surrounding triple quotes, leading/trailing whitespace, a stray
 * "Засагдсан текст:" prefix, etc.
 */
export function cleanPolishedOutput(raw: string): string {
  let out = raw.trim();

  // Remove leading "Засагдсан текст:" / "Result:" style prefixes.
  out = out.replace(/^(засагдсан\s*текст|result|output)\s*[:：]\s*/i, "");

  // Remove surrounding triple quotes (""" or ''') if the model echoed them.
  if (
    (out.startsWith('"""') && out.endsWith('"""')) ||
    (out.startsWith("'''") && out.endsWith("'''"))
  ) {
    out = out.slice(3, -3).trim();
  }

  // Remove surrounding single-pair quotes.
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"))
  ) {
    out = out.slice(1, -1).trim();
  }

  return out;
}
