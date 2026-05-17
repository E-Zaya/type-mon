/**
 * IP-based rate limiting backed by Upstash Redis.
 *
 * The limiter is created lazily on first use so the module can be imported
 * (e.g. by `app/api/polish/route.ts`) even when the env vars are missing
 * during local development. In that case, `getLimiter()` returns null and
 * the API route can decide how to behave (we choose to "fail open" in dev
 * so contributors can run the app without an Upstash account).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { POLISH_DAILY_LIMIT } from "@/lib/polish-prompt";

let cached: Ratelimit | null = null;
let initialized = false;

/**
 * Returns a singleton sliding-window limiter (10 requests / 24h per identifier),
 * or null if Upstash is not configured.
 */
export function getPolishLimiter(): Ratelimit | null {
  if (initialized) return cached;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Allow the app to boot without Upstash. Callers should treat this as
    // "no server-side limit" and rely on the client-side localStorage quota
    // as a soft cap during local dev only.
    return null;
  }

  const redis = new Redis({ url, token });

  cached = new Ratelimit({
    redis,
    // Sliding window: POLISH_DAILY_LIMIT requests over a rolling 24h.
    // Sliding (not fixed) avoids the "burst at midnight" problem.
    limiter: Ratelimit.slidingWindow(POLISH_DAILY_LIMIT, "24 h"),
    analytics: false,
    prefix: "typemon:polish",
  });

  return cached;
}

/**
 * Extract a stable client identifier from the request headers.
 *
 * Vercel sets `x-forwarded-for` (comma-separated, leftmost = original client).
 * Falls back to a placeholder so we never crash on an unparseable IP — in that
 * case the limit applies to the whole "unknown" bucket, which is fine for a
 * defensive default.
 */
export function getClientIdentifier(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;
  return "ip:unknown";
}
