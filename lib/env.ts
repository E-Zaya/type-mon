/* Public Supabase variables are safe to ship to the browser: the anon key is
   still guarded by Supabase Auth and row level security. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Where auth callbacks land. Falls back to the request origin when unset. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

/** Server-only. Never import into a client component. */
export const geminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY ?? "",
});

/**
 * Server-only. Signs the guest-quota cookie. Without it, guests cannot be
 * metered honestly, so the polish route refuses guests until it is set — a
 * loud failure in the deploy checklist beats a silent unlimited free tier.
 */
export const guestQuotaSecret = () => process.env.TYPEMON_COOKIE_SECRET ?? "";
