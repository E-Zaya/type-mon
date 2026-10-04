import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POLISH_QUOTA_COOKIE,
  parseQuota,
  quotaCookieHeader,
  quotaDay,
  quotaResetAt,
  readCookie,
  serializeQuota,
} from "./polish-quota.ts";

const SECRET = "test-secret";
// 2026-10-04 03:30 UTC = 11:30 in Ulaanbaatar
const NOW = Date.UTC(2026, 9, 4, 3, 30);

test("day and reset use Ulaanbaatar time", () => {
  assert.equal(quotaDay(NOW), "2026-10-04");
  // 2026-10-04 20:00 UTC is already 2026-10-05 in UTC+8
  assert.equal(quotaDay(Date.UTC(2026, 9, 4, 20)), "2026-10-05");
  // Next midnight UTC+8 = 2026-10-04 16:00 UTC
  assert.equal(quotaResetAt(NOW), "2026-10-04T16:00:00.000Z");
});

test("serialize then parse round-trips", () => {
  const value = serializeQuota({ day: quotaDay(NOW), used: 3 }, SECRET);
  assert.deepEqual(parseQuota(value, SECRET, NOW), { day: "2026-10-04", used: 3 });
});

test("missing, malformed, tampered or foreign-secret cookies reset to zero", () => {
  const fresh = { day: "2026-10-04", used: 0 };
  const good = serializeQuota({ day: "2026-10-04", used: 9 }, SECRET);

  assert.deepEqual(parseQuota(undefined, SECRET, NOW), fresh);
  assert.deepEqual(parseQuota("", SECRET, NOW), fresh);
  assert.deepEqual(parseQuota("garbage", SECRET, NOW), fresh);
  assert.deepEqual(parseQuota("a.b", SECRET, NOW), fresh);
  // Signed with another secret
  assert.deepEqual(parseQuota(good, "other-secret", NOW), fresh);
  // Payload edited after signing: used 9 → 0 by hand
  const forged =
    Buffer.from(JSON.stringify({ day: "2026-10-04", used: 0 })).toString("base64url") +
    good.slice(good.lastIndexOf("."));
  assert.deepEqual(parseQuota(forged, SECRET, NOW), fresh);
  // Signature with one flipped character
  const flipped = good.slice(0, -1) + (good.endsWith("A") ? "B" : "A");
  assert.deepEqual(parseQuota(flipped, SECRET, NOW), fresh);
});

test("a cookie from yesterday resets to zero", () => {
  const yesterday = serializeQuota({ day: "2026-10-03", used: 10 }, SECRET);
  assert.deepEqual(parseQuota(yesterday, SECRET, NOW), { day: "2026-10-04", used: 0 });
});

test("negative or fractional counts are rejected", () => {
  const neg = serializeQuota({ day: "2026-10-04", used: -5 }, SECRET);
  assert.equal(parseQuota(neg, SECRET, NOW).used, 0);
  const frac = serializeQuota({ day: "2026-10-04", used: 1.5 }, SECRET);
  assert.equal(parseQuota(frac, SECRET, NOW).used, 0);
});

test("readCookie picks the named cookie out of a header", () => {
  assert.equal(readCookie(null, "a"), undefined);
  assert.equal(readCookie("a=1; b=2", "b"), "2");
  assert.equal(readCookie("a=1; b=2", "c"), undefined);
  assert.equal(readCookie("ab=1; a=x.y", "a"), "x.y");
});

test("Set-Cookie header is HttpOnly, Lax, and Secure only when asked", () => {
  const state = { day: "2026-10-04", used: 1 };
  const plain = quotaCookieHeader(state, SECRET, false);
  assert.ok(plain.startsWith(`${POLISH_QUOTA_COOKIE}=`));
  assert.match(plain, /; HttpOnly/);
  assert.match(plain, /; SameSite=Lax/);
  assert.doesNotMatch(plain, /Secure/);
  assert.match(quotaCookieHeader(state, SECRET, true), /; Secure$/);
  // The value in the header parses back
  const value = readCookie(plain.split(";")[0], POLISH_QUOTA_COOKIE);
  assert.deepEqual(parseQuota(value, SECRET, NOW), state);
});
