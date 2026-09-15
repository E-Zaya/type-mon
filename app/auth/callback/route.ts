import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/* `startsWith("/")` alone is not enough: `//evil.com` and `/\evil.com` both
   resolve off-site, so a crafted link could bounce someone away from here. */
function safePath(value: string | null) {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/**
 * Where every sign-in lands. Google arrives with `code` (PKCE); the email
 * link arrives with `code` too, or with `token_hash` + `type` when the mail
 * template uses the token form. Both end in a session cookie and a redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const destination = safePath(url.searchParams.get("next"));

  const supabase = await supabaseServer();
  if (supabase && (code || (tokenHash && type))) {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
    if (error) {
      const failed = new URL("/login", url.origin);
      failed.searchParams.set("error", "auth");
      return NextResponse.redirect(failed);
    }
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
