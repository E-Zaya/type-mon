/**
 * Daily quota for /api/polish, stored in a signed cookie.
 *
 * Why a cookie and not a database: the app has no accounts, and the only
 * thing we protect is the Gemini free tier. A cookie the browser cannot
 * forge (HMAC over the payload) stops the honest majority at the limit
 * without any external service. A script that drops the cookie gets a
 * fresh counter — that is accepted; it is the same trade-off as
 * docs/saas-plan.md ("ゲスト枠は Cookie で数える").
 *
 * Server-only: uses node:crypto.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Polishes allowed per browser per day. */
export const POLISH_DAILY_LIMIT = 10;

export const POLISH_QUOTA_COOKIE = "tm_polish";

/** The day rolls over at midnight in Ulaanbaatar (UTC+8), not UTC. */
const DAY_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Cookie lifetime. Two days covers the current day plus clock skew. */
const COOKIE_MAX_AGE_SEC = 2 * 24 * 60 * 60;

export type QuotaState = {
  /** YYYY-MM-DD in UTC+8. */
  day: string;
  /** Polishes used on `day`. */
  used: number;
};

/** YYYY-MM-DD for `now` in UTC+8. */
export function quotaDay(now: number = Date.now()): string {
  return new Date(now + DAY_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO timestamp of the next midnight in UTC+8 after `now`. */
export function quotaResetAt(now: number = Date.now()): string {
  const shifted = new Date(now + DAY_OFFSET_MS);
  const nextMidnightShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1
  );
  return new Date(nextMidnightShifted - DAY_OFFSET_MS).toISOString();
}

/**
 * The HMAC key: POLISH_QUOTA_SECRET when set, otherwise a hash derived from
 * the Gemini key so that key is never used directly as a MAC key.
 */
export function deriveQuotaSecret(configured: string | undefined, apiKey: string): string {
  if (configured) return configured;
  return createHash("sha256").update(`tm-quota:${apiKey}`).digest("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Encode `state` as `payload.signature`. */
export function serializeQuota(state: QuotaState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Decode a cookie value. Anything that is missing, malformed, tampered with
 * or from an earlier day counts as "nothing used today".
 */
export function parseQuota(
  value: string | undefined,
  secret: string,
  now: number = Date.now()
): QuotaState {
  const fresh: QuotaState = { day: quotaDay(now), used: 0 };
  if (!value) return fresh;

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return fresh;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return fresh;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return fresh;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as QuotaState).day !== "string" ||
    typeof (parsed as QuotaState).used !== "number"
  ) {
    return fresh;
  }
  const state = parsed as QuotaState;
  if (state.day !== fresh.day || !Number.isInteger(state.used) || state.used < 0) {
    return fresh;
  }
  return state;
}

/** Pull one cookie out of a raw `Cookie` request header. */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/** Build the `Set-Cookie` header value that stores `state`. */
export function quotaCookieHeader(state: QuotaState, secret: string, secure: boolean): string {
  const attrs = [
    `${POLISH_QUOTA_COOKIE}=${serializeQuota(state, secret)}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
