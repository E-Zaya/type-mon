import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { entitlementOf, polishUsageOf } from "@/lib/billing";
import { guestMeteringConfigured, guestRemaining, readGuestQuota, GUEST_COOKIE } from "@/lib/guest-quota";
import { POLISH_CHARS, POLISH_LIMIT } from "@/lib/plan-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type PlanView = {
  tier: "guest" | "free" | "plus";
  status: "free" | "active" | "expired";
  planCode: "monthly" | "annual" | null;
  periodEnd: string | null;
  /** Polishes used in the current window (day for guests, month for accounts). */
  used: number;
  limit: number;
  remaining: number;
  maxChars: number;
  /** "day" | "month" — what the window is. */
  window: "day" | "month";
};

/* The one place the client learns what it may do. Derived on the server;
   editing the response changes nothing about what /api/polish allows. */
export async function GET() {
  const supabase = await supabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!supabase || !user) {
    const store = await cookies();
    const quota = readGuestQuota(store.get(GUEST_COOKIE)?.value);
    const remaining = guestMeteringConfigured() ? guestRemaining(quota) : 0;
    const view: PlanView = {
      tier: "guest",
      status: "free",
      planCode: null,
      periodEnd: null,
      used: quota.used,
      limit: POLISH_LIMIT.guest,
      remaining,
      maxChars: POLISH_CHARS.guest,
      window: "day",
    };
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  }

  const [entitlement, used] = await Promise.all([entitlementOf(supabase), polishUsageOf(supabase)]);
  const limit = POLISH_LIMIT[entitlement.tier];
  const view: PlanView = {
    tier: entitlement.tier,
    status: entitlement.status,
    planCode: entitlement.planCode,
    periodEnd: entitlement.periodEnd,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    maxChars: POLISH_CHARS[entitlement.tier],
    window: "month",
  };
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
