import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { entitlementOf } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Activates the plan for an order.
 *
 * With QPay this becomes two halves: their callback notifies, and the server
 * asks QPay whether the invoice is genuinely paid before granting anything —
 * a callback is a notification, not proof. Until then this stands in for
 * both, and the order it activates says `provider: 'demo'` in the database.
 * What carries over unchanged is idempotency: `activate_plan` extends the
 * period once no matter how often it is called with the same order.
 */
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });

  const { orderId } = (await request.json().catch(() => ({ orderId: "" }))) as { orderId?: string };
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });

  const { data, error } = await supabase.rpc("activate_plan", { order_id: orderId });
  if (error) return NextResponse.json({ error: "SCHEMA_NOT_READY" }, { status: 503 });

  const row = (data?.[0] ?? { activated: false, reason: "unknown", period_end: null }) as {
    activated: boolean;
    reason: string;
    period_end: string | null;
  };

  if (!row.activated) return NextResponse.json({ activated: false, reason: row.reason }, { status: 409 });

  return NextResponse.json(
    { activated: true, periodEnd: row.period_end, entitlement: await entitlementOf(supabase) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
