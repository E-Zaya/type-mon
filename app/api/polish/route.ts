/**
 * POST /api/polish
 *
 * Body: { text: string }
 *
 * Response (success):
 *   200 { ok: true, polished, changes, tier, remaining }
 *
 * Response (failure):
 *   400 { ok: false, error: "INVALID_INPUT" | "TOO_LONG", maxChars }
 *   401 { ok: false, error: "SIGN_IN_REQUIRED" }          — guests cannot be metered on this deploy
 *   429 { ok: false, error: "QUOTA_EXCEEDED", tier, limit, window }
 *   500 { ok: false, error: "UPSTREAM_ERROR" | "NOT_CONFIGURED" }
 *
 * The order of checks is the product: who is asking → how long may their
 * text be → do they still have a polish this window → only then the model.
 * A guest's window is a signed cookie; a member's is a row in Postgres.
 * The API key never leaves the server.
 */

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  POLISH_MODEL,
  buildPolishUserPrompt,
  cleanPolishedOutput,
  isTone,
  systemPromptFor,
  POLISH_RESPONSE_SCHEMA,
  type PolishResult,
  type PolishTone,
} from "@/lib/polish-prompt";
import { geminiConfig } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { entitlementOf, refundPolish, spendPolish } from "@/lib/billing";
import { GUEST_COOKIE, guestMeteringConfigured, guestQuotaCookie, guestRemaining, readGuestQuota } from "@/lib/guest-quota";
import { POLISH_CHARS, POLISH_LIMIT, type Tier } from "@/lib/plan-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PolishRequest = { text?: unknown; tone?: unknown };

export async function POST(request: Request): Promise<Response> {
  // ---- 1. Parse -------------------------------------------------------
  let body: PolishRequest;
  try {
    body = (await request.json()) as PolishRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });

  // ---- 2. Who is asking ------------------------------------------------
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const store = await cookies();

  let tier: Tier = "guest";
  let guest = readGuestQuota(store.get(GUEST_COOKIE)?.value);
  if (supabase && user) {
    tier = (await entitlementOf(supabase)).tier;
  } else if (!guestMeteringConfigured()) {
    return NextResponse.json({ ok: false, error: "SIGN_IN_REQUIRED" }, { status: 401 });
  }

  // A tone is a Plus feature; anyone else gets the classic edit, silently.
  const tone: PolishTone = tier === "plus" && isTone(body.tone) ? body.tone : "neutral";

  // ---- 3. Length for this tier ------------------------------------------
  const maxChars = POLISH_CHARS[tier];
  if (text.length > maxChars) {
    return NextResponse.json({ ok: false, error: "TOO_LONG", maxChars, tier }, { status: 400 });
  }

  // ---- 4. Claim one polish ------------------------------------------------
  const exceeded = (window: "day" | "month") =>
    NextResponse.json(
      { ok: false, error: "QUOTA_EXCEEDED", tier, limit: POLISH_LIMIT[tier], window },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );

  if (tier === "guest") {
    if (guestRemaining(guest) <= 0) return exceeded("day");
    guest = { day: guest.day, used: guest.used + 1 };
  } else if (supabase) {
    const claim = await spendPolish(supabase, tier);
    if (!claim.allowed) return exceeded("month");
  }

  const apiKey = geminiConfig().apiKey;
  if (!apiKey) {
    if (tier !== "guest" && supabase) await refundPolish(supabase, tier);
    return NextResponse.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 500 });
  }

  // ---- 5. Model -----------------------------------------------------------
  const startedAt = Date.now();
  let usage: { promptTokens?: number; outputTokens?: number } = {};
  let failure: string | null = null;
  let polished = "";
  let changes: PolishResult["changes"] = [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: POLISH_MODEL,
      contents: buildPolishUserPrompt(text),
      config: {
        systemInstruction: systemPromptFor(tone),
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseJsonSchema: POLISH_RESPONSE_SCHEMA,
      },
    });
    usage = {
      promptTokens: result.usageMetadata?.promptTokenCount,
      outputTokens: result.usageMetadata?.candidatesTokenCount,
    };
    const raw = (result.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    let parsed: PolishResult;
    try {
      parsed = JSON.parse(raw) as PolishResult;
    } catch (parseErr) {
      console.error("[/api/polish] JSON parse failed. Raw:", raw, parseErr);
      failure = "UPSTREAM_ERROR";
      parsed = { polished: "", changes: [] };
    }
    polished = cleanPolishedOutput(parsed.polished ?? "");
    if (!failure && !polished) failure = "UPSTREAM_ERROR";
    changes = Array.isArray(parsed.changes)
      ? parsed.changes
          .filter((c): c is { before: string; after: string; reason: string } =>
            !!c && typeof c.before === "string" && typeof c.after === "string" && typeof c.reason === "string")
          .filter((c) => c.before.trim() !== c.after.trim())
      : [];
  } catch (err) {
    console.error("[/api/polish] Gemini call failed:", err);
    failure = "UPSTREAM_ERROR";
  }

  // ---- 6. Account for it ----------------------------------------------------
  if (supabase && user) {
    // Append-only; a failed insert must never fail the polish itself.
    await supabase
      .from("ai_usage")
      .insert({
        user_id: user.id,
        route: "polish",
        model: POLISH_MODEL,
        prompt_tokens: usage.promptTokens ?? null,
        output_tokens: usage.outputTokens ?? null,
        latency_ms: Date.now() - startedAt,
        ok: failure === null,
        error_code: failure,
      })
      .then(() => undefined, () => undefined);
  }

  if (failure) {
    // The model never answered; give the claim back.
    if (tier !== "guest" && supabase) await refundPolish(supabase, tier);
    return NextResponse.json({ ok: false, error: failure }, { status: 500 });
  }

  let remaining: number;
  if (tier === "guest") {
    remaining = guestRemaining(guest);
  } else if (supabase) {
    // spendPolish reported the state after the claim; read it back cheaply.
    const { data } = await supabase.rpc("my_usage");
    const used = ((data as { meter: string; used: number }[] | null) ?? []).find((r) => r.meter === "polish")?.used ?? 0;
    remaining = Math.max(0, POLISH_LIMIT[tier] - used);
  } else {
    remaining = 0;
  }

  const response = NextResponse.json(
    { ok: true, polished, changes, tier, remaining, tone },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (tier === "guest") {
    const cookie = guestQuotaCookie(guest);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
