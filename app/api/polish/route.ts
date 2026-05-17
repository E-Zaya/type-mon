/**
 * POST /api/polish
 *
 * Body: { text: string }
 *
 * Response (success):
 *   200 { ok: true, polished: string, remaining: number }
 *
 * Response (failure):
 *   400 { ok: false, error: "INVALID_INPUT" | "TOO_LONG", remaining?: number }
 *   429 { ok: false, error: "RATE_LIMIT", remaining: 0, retryAfter: number }
 *   500 { ok: false, error: "UPSTREAM_ERROR" | "NOT_CONFIGURED" }
 *
 * Notes:
 * - Runs on the default Node.js runtime — @google/generative-ai is more
 *   reliable there than on Edge. (See AGENTS.md: Next.js 16 lets us pick.)
 * - The API key never leaves the server; the browser only ever sees the
 *   resulting text and a remaining-count.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  POLISH_MAX_CHARS,
  POLISH_MODEL,
  POLISH_SYSTEM_PROMPT,
  buildPolishUserPrompt,
  cleanPolishedOutput,
  type PolishResult,
} from "@/lib/polish-prompt";
import { getClientIdentifier, getPolishLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";
// Always run at request time — we read headers and call an external API.
export const dynamic = "force-dynamic";

type PolishRequest = { text?: unknown };

export async function POST(request: Request): Promise<Response> {
  // ---- 1. Parse + validate body ---------------------------------------
  let body: PolishRequest;
  try {
    body = (await request.json()) as PolishRequest;
  } catch {
    return Response.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }
  if (text.length > POLISH_MAX_CHARS) {
    return Response.json(
      { ok: false, error: "TOO_LONG" },
      { status: 400 }
    );
  }

  // ---- 2. Rate limit by IP --------------------------------------------
  const limiter = getPolishLimiter();
  let remaining = Number.POSITIVE_INFINITY;

  if (limiter) {
    const identifier = getClientIdentifier(request);
    const result = await limiter.limit(identifier);
    remaining = result.remaining;

    if (!result.success) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
      );
      return Response.json(
        {
          ok: false,
          error: "RATE_LIMIT",
          remaining: 0,
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production we refuse to run without a configured limiter — the
    // Gemini free tier is shared across all users and unguarded access
    // would burn through the quota in minutes.
    return Response.json(
      { ok: false, error: "NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  // ---- 3. Call Gemini --------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: POLISH_MODEL,
      systemInstruction: POLISH_SYSTEM_PROMPT,
      generationConfig: {
        // Low temperature → stable, conservative corrections.
        temperature: 0.3,
        // Generous cap so the "changes" array isn't truncated. Lite model
        // is cheap enough that this isn't a cost concern.
        maxOutputTokens: 2048,
        // Force structured JSON output — eliminates "model added prose"
        // bugs and lets us parse with JSON.parse.
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            polished: { type: SchemaType.STRING },
            changes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  before: { type: SchemaType.STRING },
                  after: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING },
                },
                required: ["before", "after", "reason"],
              },
            },
          },
          required: ["polished", "changes"],
        },
      },
    });

    const result = await model.generateContent(buildPolishUserPrompt(text));
    const raw = result.response.text();

    let parsed: PolishResult;
    try {
      // The model returns JSON because of responseMimeType, but be defensive:
      // some models still wrap output in ```json fences when unhappy.
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      parsed = JSON.parse(cleaned) as PolishResult;
    } catch (parseErr) {
      console.error("[/api/polish] JSON parse failed. Raw:", raw, parseErr);
      return Response.json(
        { ok: false, error: "UPSTREAM_ERROR" },
        { status: 500 }
      );
    }

    const polished = cleanPolishedOutput(parsed.polished ?? "");
    if (!polished) {
      return Response.json(
        { ok: false, error: "UPSTREAM_ERROR" },
        { status: 500 }
      );
    }

    // Defensive: ensure changes is always an array of well-shaped records.
    const changes = Array.isArray(parsed.changes)
      ? parsed.changes
          .filter(
            (c): c is { before: string; after: string; reason: string } =>
              !!c &&
              typeof c.before === "string" &&
              typeof c.after === "string" &&
              typeof c.reason === "string"
          )
          // Drop no-op entries — sometimes the model echoes unchanged words.
          .filter((c) => c.before.trim() !== c.after.trim())
      : [];

    return Response.json({
      ok: true,
      polished,
      changes,
      remaining: Number.isFinite(remaining) ? remaining : null,
    });
  } catch (err) {
    // Don't leak stack traces / API messages to the client.
    console.error("[/api/polish] Gemini call failed:", err);
    return Response.json(
      { ok: false, error: "UPSTREAM_ERROR" },
      { status: 500 }
    );
  }
}
