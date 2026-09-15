/* Client-safe plan facts, shared by the server gates and the pages that sell
   the plan. Importable from the browser: numbers only, no secrets.

   Basis (docs/saas-plan.md): one AI polish on gemini-2.5-flash-lite costs
   about 0.6₮ for a typical sentence and 2.5₮ at the 2,000-character cap, so a
   Plus member who uses every last request still costs under 2,500₮ against a
   6,900₮ price. */

export type Tier = "guest" | "free" | "plus";
export type PlanCode = "monthly" | "annual";

export const PRICES_MNT: Record<PlanCode, number> = {
  monthly: 6_900,
  annual: 49_000,
};

export const PLAN_DAYS: Record<PlanCode, number> = {
  monthly: 30,
  annual: 365,
};

/** AI polish requests. Guests count per day, accounts per calendar month. */
export const POLISH_LIMIT: Record<Tier, number> = {
  guest: 3,
  free: 30,
  plus: 1_000,
};

/** Longest text one polish accepts, in characters. */
export const POLISH_CHARS: Record<Tier, number> = {
  guest: 500,
  free: 500,
  plus: 2_000,
};

/** 6900 -> "6,900₮" */
export function formatMnt(amount: number) {
  return `${amount.toLocaleString("en-US")}₮`;
}
