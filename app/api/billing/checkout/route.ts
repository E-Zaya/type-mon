import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseServer } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing";
import type { PlanCode } from "@/lib/plan-constants";

export const runtime = "nodejs";

/**
 * Creates an order and returns what the checkout screen needs to draw.
 *
 * Today the order is `provider: 'demo'` and the QR encodes our own confirm
 * URL, so scanning it on a phone completes the rehearsal the same way the
 * on-screen button does. The QPay integration replaces only the body of
 * this route: POST the invoice to the merchant API, store its id in
 * `provider_ref`, and return QPay's QR payload and bank deep links. The
 * order row, amount, expiry and response shape stay as they are.
 */
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });

  const { plan } = (await request.json().catch(() => ({ plan: "" }))) as { plan?: string };
  if (!plan || !(plan in PLANS)) return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });

  const planCode = plan as PlanCode;
  const { amountMnt } = PLANS[planCode];

  const { data, error } = await supabase
    .from("payment_orders")
    .insert({ user_id: auth.user.id, plan_code: planCode, amount_mnt: amountMnt, provider: "demo", status: "pending" })
    .select("id, amount_mnt, plan_code, expires_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "SCHEMA_NOT_READY" }, { status: 503 });

  const target = `${new URL(request.url).origin}/plus/checkout?plan=${planCode}&confirm=${data.id}`;
  const qrSvg = await QRCode.toString(target, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1a1a", light: "#00000000" },
  });

  return NextResponse.json(
    { orderId: data.id, planCode: data.plan_code, amountMnt: data.amount_mnt, expiresAt: data.expires_at, qrSvg, qrTarget: target, provider: "demo" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
