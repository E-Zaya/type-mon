"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { POLISH_LIMIT } from "@/lib/plan-constants";

/* Two ways in, no password. The copy sells the one thing an account changes
   right now: more AI polishes. */
export default function LoginPanel() {
  const { mode, signInWithGoogle, signInWithEmail } = useAuth();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/";
  const failed = params?.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(failed ? "Холбоос хүчингүй болсон байна. Дахин оролдоно уу." : null);

  if (mode === "unconfigured") {
    return <p className="text-sm text-black/60 dark:text-white/60">Нэвтрэх боломж энэ орчинд тохируулагдаагүй байна.</p>;
  }

  async function google() {
    setBusy("google");
    setError(null);
    const message = await signInWithGoogle(next);
    if (message) {
      setError(message);
      setBusy(null);
    }
    // On success the browser is leaving for Google; nothing to reset.
  }

  async function magic(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy("email");
    setError(null);
    const message = await signInWithEmail(address, next);
    setBusy(null);
    if (message) setError(message);
    else setSentTo(address);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base text-black/90 dark:text-white/90">
          <span className="font-mono">{sentTo}</span> руу нэвтрэх холбоос илгээлээ.
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">
          Имэйлээ нээгээд холбоос дээр дарахад л болно. Спам хавтсаа бас шалгаарай.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="self-start text-sm text-[#1D9E75] hover:underline"
        >
          Өөр хаягаар оролдох
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="grid gap-1.5 text-sm text-black/70 dark:text-white/70">
        <li className="flex gap-2"><span className="text-[#1D9E75]">✓</span>AI засвар сард {POLISH_LIMIT.free} удаа (зочин: өдөрт {POLISH_LIMIT.guest})</li>
        <li className="flex gap-2"><span className="text-[#1D9E75]">✓</span>Plus-д шилжвэл сард {POLISH_LIMIT.plus.toLocaleString("en-US")} удаа, 2,000 тэмдэгт</li>
        <li className="flex gap-2"><span className="text-[#1D9E75]">✓</span>Нууц үг хэрэггүй — Google эсвэл имэйлийн холбоос</li>
      </ul>

      <button
        type="button"
        onClick={google}
        disabled={busy !== null}
        className="
          w-full min-h-[44px] inline-flex items-center justify-center gap-2.5
          bg-white text-black/90 hover:bg-white/90
          border border-black/10
          rounded-lg text-sm font-medium
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <GoogleMark />
        {busy === "google" ? "Google руу шилжиж байна…" : "Google-ээр нэвтрэх"}
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-black/40 dark:text-white/40">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        эсвэл
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <form onSubmit={magic} className="flex flex-col gap-2">
        <label htmlFor="login-email" className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50 px-1">
          Имэйл
        </label>
        <div className="flex gap-2">
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="
              flex-1 min-w-0 h-11 px-4 rounded-lg
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              text-black/90 dark:text-white/90
              placeholder-black/30 dark:placeholder-white/25
              outline-none focus:border-[#1D9E75]/60
            "
          />
          <button
            type="submit"
            disabled={busy !== null || !email.trim()}
            className="
              h-11 px-4 rounded-lg
              bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
              transition-colors duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {busy === "email" ? "Илгээж байна…" : "Холбоос авах"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
