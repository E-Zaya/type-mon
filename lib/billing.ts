import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_DAYS, POLISH_LIMIT, PRICES_MNT, type PlanCode, type Tier } from "@/lib/plan-constants";

export type Status = "free" | "active" | "expired";

export const PLANS: Record<PlanCode, { amountMnt: number; days: number }> = {
  monthly: { amountMnt: PRICES_MNT.monthly, days: PLAN_DAYS.monthly },
  annual: { amountMnt: PRICES_MNT.annual, days: PLAN_DAYS.annual },
};

export type Entitlement = {
  tier: Exclude<Tier, "guest">;
  status: Status;
  planCode: PlanCode | null;
  periodEnd: string | null;
};

const FREE: Entitlement = { tier: "free", status: "free", planCode: null, periodEnd: null };

/**
 * The caller's plan, resolved in the database.
 *
 * Falls back to free on any error, including a deploy where the migration
 * has not run yet. Failing towards free costs someone their paid features
 * for a few minutes; failing towards plus would give the product away.
 */
export async function entitlementOf(supabase: SupabaseClient): Promise<Entitlement> {
  const { data, error } = await supabase.rpc("my_entitlement");
  if (error || !data?.[0]) return FREE;
  const row = data[0] as { tier: "free" | "plus"; status: Status; plan_code: PlanCode | null; period_end: string | null };
  return { tier: row.tier, status: row.status, planCode: row.plan_code, periodEnd: row.period_end };
}

export type QuotaResult = { allowed: boolean; used: number; remaining: number };

/**
 * Claims one polish from the month's allowance, or refuses. The check and
 * the spend are one statement in Postgres, so two requests racing for the
 * last one cannot both win.
 */
export async function spendPolish(supabase: SupabaseClient, tier: Exclude<Tier, "guest">, amount = 1): Promise<QuotaResult> {
  const { data, error } = await supabase.rpc("spend_quota", {
    meter_name: "polish",
    allowance: POLISH_LIMIT[tier],
    amount,
  });
  // No meter yet (migration missing): let the call through rather than
  // refusing every polish after a bad rollout.
  if (error || !data?.[0]) return { allowed: true, used: 0, remaining: -1 };
  const row = data[0] as QuotaResult;
  return { allowed: row.allowed, used: row.used, remaining: row.remaining };
}

/** Gives back a claim whose model call then failed. */
export async function refundPolish(supabase: SupabaseClient, tier: Exclude<Tier, "guest">) {
  await supabase
    .rpc("spend_quota", { meter_name: "polish", allowance: POLISH_LIMIT[tier], amount: -1 })
    .then(() => undefined, () => undefined);
}

/** Polishes used this month. */
export async function polishUsageOf(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("my_usage");
  if (error || !data) return 0;
  const row = (data as { meter: string; used: number }[]).find((r) => r.meter === "polish");
  return row?.used ?? 0;
}

/** Days left, rounded up, so "0" only ever means expired. */
export function daysLeft(iso: string | null, now = new Date()) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
