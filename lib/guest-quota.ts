import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { guestQuotaSecret } from "@/lib/env";
import { POLISH_LIMIT } from "@/lib/plan-constants";

/*
 * Guests get a few polishes a day without an account. The count lives in a
 * signed cookie rather than a database row keyed by IP: no rows for people
 * who never sign up, and nothing to clean up. Clearing cookies resets it,
 * which is an accepted cost — the daily allowance is small, and the point of
 * the limit is to make signing in worth it, not to stop a determined script.
 */

export const GUEST_COOKIE = "tm_guest";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 2;

export type GuestQuota = { day: number; used: number };

/* Production must set the secret; a local checkout without one still works,
   with a signing key everyone knows — fine for a laptop, useless on a server. */
function secretOrDev(): string {
  const secret = guestQuotaSecret();
  if (secret) return secret;
  return process.env.NODE_ENV === "production" ? "" : "typemon-dev-only-guest-secret";
}

function today(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Reads and verifies the cookie. Tampered or stale cookies read as unused. */
export function readGuestQuota(cookie: string | undefined): GuestQuota {
  const secret = secretOrDev();
  const fresh = { day: today(), used: 0 };
  if (!cookie || !secret) return fresh;
  const [payload, mac] = cookie.split(".");
  if (!payload || !mac) return fresh;
  const expected = sign(payload, secret);
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return fresh;
  const [dayRaw, usedRaw] = payload.split(":");
  const day = Number(dayRaw);
  const used = Number(usedRaw);
  if (!Number.isInteger(day) || !Number.isInteger(used) || used < 0) return fresh;
  return day === fresh.day ? { day, used } : fresh;
}

/** The Set-Cookie value for an updated count. */
export function guestQuotaCookie(quota: GuestQuota): { name: string; value: string; options: Record<string, unknown> } {
  const payload = `${quota.day}:${quota.used}`;
  const value = `${payload}.${sign(payload, secretOrDev())}`;
  return {
    name: GUEST_COOKIE,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  };
}

export function guestRemaining(quota: GuestQuota): number {
  return Math.max(0, POLISH_LIMIT.guest - quota.used);
}

/** True when the deployment can meter guests at all. */
export function guestMeteringConfigured(): boolean {
  return secretOrDev().length >= 16;
}
