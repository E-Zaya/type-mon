"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";

type AuthValue = {
  /** False until the first session check finished. */
  ready: boolean;
  signedIn: boolean;
  /** "unconfigured" when the deployment has no Supabase; sign-in UI hides. */
  mode: "supabase" | "unconfigured";
  email: string | null;
  name: string;
  avatarUrl: string;
  signInWithGoogle: (next?: string) => Promise<string | null>;
  signInWithEmail: (email: string, next?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function callbackUrl(next = "/") {
  const origin = SITE_URL || window.location.origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/* Supabase speaks English in its auth errors; these are the ones a person
   can actually hit from the two buttons on /login. */
function translate(message: string) {
  if (/rate limit|too many/i.test(message)) return "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.";
  if (/invalid email|valid email/i.test(message)) return "Имэйл хаяг буруу байна.";
  if (/signups not allowed|disabled/i.test(message)) return "Бүртгэл түр хаалттай байна.";
  return "Алдаа гарлаа. Дахин оролдоно уу.";
}

function nameOf(user: User | null) {
  const meta = user?.user_metadata ?? {};
  const full = String(meta.full_name ?? meta.name ?? "").trim();
  if (full) return full;
  const local = user?.email?.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      window.queueMicrotask(() => setReady(true));
      return;
    }
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setReady(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async (next = "/") => {
    if (!supabase) return "Нэвтрэх тохиргоо хийгдээгүй байна.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    return error ? translate(error.message) : null;
  }, [supabase]);

  const signInWithEmail = useCallback(async (email: string, next = "/") => {
    if (!supabase) return "Нэвтрэх тохиргоо хийгдээгүй байна.";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
    });
    return error ? translate(error.message) : null;
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value: AuthValue = {
    ready,
    signedIn: Boolean(user),
    mode: supabase ? "supabase" : "unconfigured",
    email: user?.email ?? null,
    name: nameOf(user),
    avatarUrl: typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "",
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
