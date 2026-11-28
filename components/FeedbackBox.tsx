"use client";

import { useEffect, useRef, useState } from "react";

// 全アプリ共通の受け口 (ezaya.dev)。届け先はそちらの設定で決まる
// ezaya.dev は www へ転送する。転送があると別ドメインからの送信をブラウザが止めるので、最初から www へ
const ENDPOINT = "https://www.ezaya.dev/api/feedback";
const MESSAGE_MAX = 2000;

type Kind = "bug" | "idea" | "love";
type State = "idle" | "sending" | "sent" | "error";

const KINDS: Array<[Kind, string]> = [
  ["bug", "Хүндрэл"],
  ["idea", "Хүсэлт"],
  ["love", "Таалагдсан"],
];

/** 設定の一番下に置く Feedback の窓。開いた瞬間から書ける */
export default function FeedbackBox() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const openedAt = useRef(0);
  const website = useRef<HTMLInputElement>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "typemon-web",
          kind,
          message,
          email,
          website: website.current?.value ?? "",
          version: (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
          page: location.pathname,
          locale: navigator.language,
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      if (res.status === 429) {
        setError("Дараалан илгээсэн тул түр хүлээгээд дахин оролдоно уу.");
        setState("error");
        return;
      }
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) throw new Error();
      setState("sent");
    } catch {
      setError("Илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-lg border border-[var(--border-color)] bg-[var(--card-strong)] p-4 text-center">
        <p className="text-base text-foreground">Санал хүсэлтийг хүлээн авлаа!</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground-muted)]">
          Баярлалаа. Таны саналыг TypeMon-оо сайжруулахад ашиглаж, судалж үзээд хэрэгжүүлнэ.
        </p>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setKind(null);
            setState("idle");
            openedAt.current = Date.now();
          }}
          className="mt-3 min-h-10 rounded-md px-3 text-sm text-accent transition-colors duration-150 hover:bg-[var(--card)]"
        >
          Дахин илгээх
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
        Анзаарсан зүйл, хүндрэл, хүсэж буй боломжоо бичээрэй. Ганц үг ч болно.
      </p>

      {/* 罠の欄 — 人には見えない */}
      <input ref={website} type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(kind === k ? null : k)}
            className={`min-h-9 rounded-full border px-3.5 text-sm transition-colors duration-150 ${
              kind === k
                ? "border-accent bg-accent/15 text-foreground"
                : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={4}
        aria-label="Санал хүсэлт"
        placeholder="Жишээ: Энэ үг буруу хөрвөж байна"
        className="w-full resize-y rounded-md border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-base text-foreground outline-none transition-colors duration-150 focus:border-accent"
      />

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        aria-label="Цахим шуудан"
        placeholder="Цахим шуудан (хариу хүсвэл)"
        className="w-full rounded-md border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-base text-foreground outline-none transition-colors duration-150 focus:border-accent"
      />

      <button
        type="submit"
        disabled={!message.trim() || state === "sending"}
        className="min-h-11 rounded-md bg-accent px-4 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
      >
        {state === "sending" ? "Илгээж байна…" : "Санал хүсэлт илгээх"}
      </button>

      <p className="text-xs text-[var(--foreground-muted)]">
        Хөтөч болон төхөөрөмжийн мэдээлэл хамт очно.
      </p>

      <div aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
        {state === "error" && error}
      </div>
    </form>
  );
}
