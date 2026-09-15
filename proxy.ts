import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/* Keeps the short-lived Supabase access token fresh on every page load.

   TypeMon has no signed-in-only pages — the converter and the typing test
   work without an account — so this never redirects, apart from sending an
   already signed-in visitor away from /login. Row level security in Postgres
   is the actual protection; this is bookkeeping. */
export default async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  // Static assets and the image routes never need a session.
  matcher: ["/((?!_next/|og|icon|apple-icon|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
