"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { track } from "@vercel/analytics";
import { cleanName, encodeResult, modeLabel, NAME_MAX, nextTier, percentile, quip, style, tierFor, type WpmResult } from "@/lib/wpm-rank";

type Props = {
  result: WpmResult;
  /** Absolute origin for share links (window.location.origin on the client). */
  origin?: string;
  /** Shown on the share landing page instead of "play again". */
  visitor?: boolean;
  onRetry?: () => void;
};

const SITE = "https://type-mon.vercel.app";

export default function ResultCard({ result, origin, visitor = false, onRetry }: Props) {
  const tier = tierFor(result.wpm);
  const next = nextTier(result.wpm);
  const pct = percentile(result.wpm, result.mode);
  const base = origin ?? SITE;
  // A name makes the result usable on a class board; it travels in the link.
  const [name, setName] = useState(result.name ?? "");
  const query = encodeResult({ ...result, name: cleanName(name) });
  const shareUrl = `${base}/wpm/r?${query}`;
  const boardUrl = `${base}/wpm/board?r=${encodeURIComponent(query)}`;
  const challengeUrl = `${base}/wpm?mode=${result.mode}&target=${result.wpm}`;
  const imageUrl = `${base}/og/wpm?${query}`;
  // 1080×1920 for Instagram / Facebook stories; same query as the OG card.
  const storyUrl = `${base}/og/wpm/story?${query}`;
  const text = `${tier.emoji} ${result.wpm} WPM — ${tier.name}. Монголчуудын ${pct}%-иас хурдан. Чи давж чадах уу?`;

  const [copied, setCopied] = useState<"link" | "challenge" | null>(null);
  // Web Share exists on phones and not on most desktops; decided on the client only.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false
  );

  const share = useCallback(
    (via: string) => track("share", { via, mode: result.mode, wpm: result.wpm }),
    [result.mode, result.wpm]
  );

  const copy = useCallback(async (value: string, kind: "link" | "challenge") => {
    share(kind);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the URL is still visible in the address bar */
    }
  }, [share]);

  const nativeShare = useCallback(async () => {
    share("native");
    try {
      await navigator.share({ title: "TypeMon Хурд", text, url: shareUrl });
    } catch {
      /* dismissed */
    }
  }, [share, text, shareUrl]);

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="
        relative overflow-hidden
        bg-[#eeede8] dark:bg-[#242424]
        border border-black/8 dark:border-white/10
        rounded-2xl p-5 md:p-7
      "
      aria-label="Үр дүн"
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-8 items-center">
        {/* Emblem */}
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="
            w-28 h-28 md:w-36 md:h-36 mx-auto md:mx-0
            grid place-items-center rounded-2xl
            bg-[#1D9E75]/10 border border-[#1D9E75]/25
            text-6xl md:text-7xl
          "
          aria-hidden="true"
        >
          {tier.emoji}
        </motion.div>

        {/* Numbers */}
        <div className="text-center md:text-left">
          <div className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
            {modeLabel(result.mode)} · 60 сек
          </div>
          <div className="mt-1 flex items-baseline justify-center md:justify-start gap-2">
            <span className="font-light tracking-tight text-6xl md:text-7xl tabular-nums text-black dark:text-white">{result.wpm}</span>
            <span className="text-lg text-black/50 dark:text-white/50">WPM</span>
          </div>
          <div className="mt-2 font-cyrillic text-2xl md:text-3xl font-light text-[#1D9E75]">{tier.name}</div>
          <div className="mt-1 text-sm text-black/70 dark:text-white/70">{tier.line}</div>

          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
            <Stat label="Үнэн зөв" value={`${result.accuracy}%`} />
            <Stat label="Үг" value={String(result.words)} />
            <Stat label="Алдаа" value={String(result.mistakes)} />
            <Stat label="Тэмдэгт" value={String(result.chars)} />
          </div>
        </div>
      </div>

      {/* Lines people quote */}
      <div className="mt-6 grid gap-2 text-sm">
        <p className="font-medium text-black/90 dark:text-white/90">
          Монголчуудын <span className="text-[#1D9E75] font-semibold">{pct}%</span>-иас хурдан
          <span className="text-black/40 dark:text-white/40"> · тооцоолол</span>
        </p>
        <p className="text-black/75 dark:text-white/75">{quip(result)}</p>
        <p className="text-black/60 dark:text-white/60">{style(result.accuracy)}</p>
        {next && (
          <p className="text-black/50 dark:text-white/50">
            Дараагийн цол {next.emoji} {next.name} — дахиад {next.min - result.wpm} WPM.
          </p>
        )}
      </div>

      {/* Name for the class board (optional) */}
      {!visitor && (
        <label className="mt-5 flex items-center gap-2 text-sm">
          <span className="text-black/60 dark:text-white/60">Нэр</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Самбар дээр харагдана"
            className="
              flex-1 min-w-0 max-w-xs h-9 px-3 rounded-lg
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              text-black/90 dark:text-white/90
              placeholder-black/30 dark:placeholder-white/25
              outline-none focus:border-[#1D9E75]/60
            "
          />
        </label>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {visitor ? (
          <Link
            href={`/wpm?mode=${result.mode}&target=${result.wpm}`}
            className="
              inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg
              bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
              transition-colors duration-150
            "
          >
            Би давна 🏇
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="
              inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg
              bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
              transition-colors duration-150
            "
          >
            Дахин
          </button>
        )}

        {canShare && (
          <ActionButton onClick={nativeShare}>Хуваалцах</ActionButton>
        )}
        <a href={facebook} target="_blank" rel="noopener noreferrer" className={actionClass} onClick={() => share("facebook")}>Facebook</a>
        <a href={twitter} target="_blank" rel="noopener noreferrer" className={actionClass} onClick={() => share("x")}>X</a>
        <ActionButton onClick={() => copy(shareUrl, "link")}>{copied === "link" ? "Хууллаа ✓" : "Холбоос"}</ActionButton>
        {!visitor && (
          <ActionButton onClick={() => copy(challengeUrl, "challenge")}>
            {copied === "challenge" ? "Хууллаа ✓" : "Найзаа сорих"}
          </ActionButton>
        )}
        <Link href={boardUrl.replace(base, "")} className={actionClass} onClick={() => share("board")}>Самбар</Link>
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className={actionClass} onClick={() => share("image")}>Зураг</a>
        {/* download works same-origin (production); elsewhere the image opens in a new tab */}
        <a href={storyUrl} download={`typemon-${result.wpm}wpm-story.png`} target="_blank" rel="noopener noreferrer" className={actionClass} onClick={() => share("story")}>
          Story зураг
        </a>
      </div>
    </motion.section>
  );
}

const actionClass = `
  inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-lg
  bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
  border border-black/10 dark:border-white/10
  text-sm text-black/80 dark:text-white/80
  transition-colors duration-150
`;

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={actionClass}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <span className="font-mono text-black/80 dark:text-white/80 tabular-nums normal-case">{value}</span>
    </span>
  );
}
