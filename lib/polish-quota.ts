/**
 * Client-side daily quota tracker for the "polish" button.
 *
 * This is a UX helper, NOT a security boundary. A user can clear localStorage
 * and bypass it; the server-side IP limiter (lib/ratelimit.ts) is the real
 * defense. The point of this module is to:
 *   - show the user how many polishes they have left without round-tripping
 *   - prevent obviously-wasted requests when the quota is already exhausted
 *
 * The "day" is the user's local YYYY-MM-DD. That's the same day the user
 * thinks in, which matters more than UTC for friendliness.
 */

import { POLISH_DAILY_LIMIT } from "@/lib/polish-prompt";

const QUOTA_KEY = "typemon-polish-quota";

type QuotaState = {
  /** YYYY-MM-DD in the user's local timezone. */
  date: string;
  /** Number of successful polish requests on `date`. */
  used: number;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function read(): QuotaState {
  if (typeof window === "undefined") {
    return { date: todayKey(), used: 0 };
  }
  try {
    const raw = window.localStorage.getItem(QUOTA_KEY);
    if (!raw) return { date: todayKey(), used: 0 };
    const parsed = JSON.parse(raw) as Partial<QuotaState>;
    if (
      !parsed ||
      typeof parsed.date !== "string" ||
      typeof parsed.used !== "number"
    ) {
      return { date: todayKey(), used: 0 };
    }
    // Reset if the local date has rolled over.
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), used: 0 };
    }
    return { date: parsed.date, used: Math.max(0, parsed.used) };
  } catch {
    return { date: todayKey(), used: 0 };
  }
}

function write(state: QuotaState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUOTA_KEY, JSON.stringify(state));
  } catch {
    /* swallow — quota tracking is best-effort */
  }
}

/** Remaining polishes for today, according to the local cache. */
export function getRemainingPolishes(): number {
  const { used } = read();
  return Math.max(0, POLISH_DAILY_LIMIT - used);
}

/** Increment the local "used" counter after a successful polish. */
export function recordPolishUsed(): number {
  const state = read();
  const next: QuotaState = { date: state.date, used: state.used + 1 };
  write(next);
  return Math.max(0, POLISH_DAILY_LIMIT - next.used);
}

/**
 * Sync the local counter with the server's authoritative remaining count.
 * Call after a successful API response so the user's cache matches reality
 * (e.g. if they cleared storage or use multiple browsers on the same IP).
 */
export function syncRemainingFromServer(serverRemaining: number | null) {
  if (serverRemaining == null || !Number.isFinite(serverRemaining)) return;
  const clamped = Math.max(0, Math.min(POLISH_DAILY_LIMIT, serverRemaining));
  const used = POLISH_DAILY_LIMIT - clamped;
  write({ date: todayKey(), used });
}

/** Mark today as fully used — call when the server returns 429. */
export function markQuotaExhausted() {
  write({ date: todayKey(), used: POLISH_DAILY_LIMIT });
}
