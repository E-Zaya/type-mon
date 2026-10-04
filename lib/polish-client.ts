/**
 * Browser side of /api/polish: the request, and the mapping from API
 * outcomes to what the editor shows. Kept out of the component so it can
 * be unit-tested with a fake fetch.
 */

// Relative with extension so the node:test runner can resolve it too.
import { POLISH_MAX_CHARS, type PolishChange } from "./polish-prompt.ts";

export type PolishStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "done";
      /** The cyrillic text that was sent — used to detect "same input, skip API". */
      source: string;
      polished: string;
      changes: PolishChange[];
    }
  | { kind: "error"; message: string };

export const POLISH_MESSAGES = {
  offline: "Интернетгүй үед AI засвар ажиллахгүй. Үндсэн хөрвүүлэлт офлайнаар ажиллана.",
  tooLong: `Уртаа хэтэрсэн байна (${POLISH_MAX_CHARS} тэмдэгтээс багатай байх ёстой).`,
  notConfigured: "Үйлчилгээ тохируулагдаагүй байна.",
  quotaExceeded: "Өнөөдрийн AI засварын хязгаарт хүрлээ. Маргааш дахин оролдоно уу.",
  upstream: "Алдаа гарлаа. Дахин оролдоно уу.",
  network: "Сүлжээний алдаа гарлаа. Дахин оролдоно уу.",
} as const;

/** Human message for an API error code. Unknown codes get the generic one. */
export function polishErrorMessage(code: string | undefined): string {
  switch (code) {
    case "TOO_LONG":
      return POLISH_MESSAGES.tooLong;
    case "NOT_CONFIGURED":
      return POLISH_MESSAGES.notConfigured;
    case "QUOTA_EXCEEDED":
      return POLISH_MESSAGES.quotaExceeded;
    default:
      return POLISH_MESSAGES.upstream;
  }
}

type PolishResponse = {
  ok: boolean;
  polished?: string;
  changes?: PolishChange[];
  error?: string;
} | null;

/**
 * Send `source` to /api/polish and turn the answer into a status.
 * Never throws: network failures become an error status.
 */
export async function requestPolish(
  source: string,
  fetchImpl: typeof fetch = fetch
): Promise<PolishStatus> {
  try {
    const res = await fetchImpl("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: source }),
    });
    const data = (await res.json().catch(() => null)) as PolishResponse;

    if (!res.ok || !data?.ok || !data.polished) {
      return { kind: "error", message: polishErrorMessage(data?.error) };
    }
    return {
      kind: "done",
      source,
      polished: data.polished,
      changes: data.changes ?? [],
    };
  } catch {
    return { kind: "error", message: POLISH_MESSAGES.network };
  }
}
