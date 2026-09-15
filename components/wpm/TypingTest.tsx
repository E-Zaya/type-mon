"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { transliterate } from "@/lib/transliterate";
import { TEST_SECONDS, daySeed, sessionWords, type WpmMode } from "@/lib/wpm-words";
import type { WpmResult } from "@/lib/wpm-rank";

type Props = {
  mode: WpmMode;
  /** A friend's WPM to beat, shown as a target line. */
  target?: number;
  onFinish: (result: WpmResult) => void;
};

type Phase = "idle" | "running";

/* The stream is a wrapping paragraph; only three lines are visible and the
   active word is kept on the second one, so the eye never has to travel. */
const LINE_HEIGHT = 44;
const VISIBLE_LINES = 3;

export default function TypingTest({ mode, target, onFinish }: Props) {
  const seed = useMemo(() => daySeed(), []);
  const words = useMemo(() => sessionWords(mode, seed), [mode, seed]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [scroll, setScroll] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);

  // What the player sees under the word: in TypeMon mode the Latin keys are
  // converted as they come in, exactly like the main editor.
  const shown = mode === "cy" ? transliterate(typed) : typed;

  const correctChars = useMemo(
    () => results.reduce((sum, ok, i) => (ok ? sum + words[i].length + 1 : sum), 0),
    [results, words]
  );
  const correctWords = results.filter(Boolean).length;
  const mistakes = results.length - correctWords;
  const elapsed = TEST_SECONDS - secondsLeft;
  const liveWpm = elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60)) : 0;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const total = results.length;
    const accuracy = total === 0 ? 0 : Math.round((correctWords / total) * 100);
    onFinish({
      mode,
      wpm: Math.round(correctChars / 5),
      accuracy,
      chars: correctChars,
      words: correctWords,
      mistakes,
      day: seed,
    });
  }, [results.length, correctWords, correctChars, mistakes, mode, seed, onFinish]);

  // Countdown. Starts on the first key, ends the run at zero.
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const start = startedAt.current ?? Date.now();
      const left = Math.max(0, TEST_SECONDS - Math.floor((Date.now() - start) / 1000));
      setSecondsLeft(left);
      if (left === 0) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && secondsLeft === 0) finish();
  }, [phase, secondsLeft, finish]);

  // Keep the active word on the second visible line.
  useLayoutEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const active = stream.querySelector<HTMLElement>("[data-active='true']");
    if (!active) return;
    const line = Math.round(active.offsetTop / LINE_HEIGHT);
    setScroll(Math.max(0, line - 1) * LINE_HEIGHT);
  }, [index]);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    focus();
  }, [focus]);

  function commitWord(value: string) {
    const attempt = mode === "cy" ? transliterate(value) : value;
    const ok = attempt.trim().toLowerCase() === words[index].toLowerCase();
    setResults((r) => [...r, ok]);
    setIndex((i) => i + 1);
    setTyped("");
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (finished.current) return;
    const value = event.target.value;
    if (phase === "idle" && value.trim()) {
      startedAt.current = Date.now();
      setPhase("running");
    }
    // A space ends the word; anything typed after it starts the next one.
    if (value.endsWith(" ")) {
      if (value.trim()) commitWord(value);
      else setTyped("");
      return;
    }
    setTyped(value);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (typed.trim()) commitWord(typed);
    }
  }

  const targetLine = target ? Math.min(100, Math.round((liveWpm / target) * 100)) : null;

  return (
    <div className="flex flex-col gap-4" onClick={focus}>
      {/* Status row */}
      <div className="flex items-center justify-between px-1 text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span>Хугацаа</span>
            <span
              className={`font-mono tabular-nums text-sm ${
                phase === "running" && secondsLeft <= 5 ? "text-red-500 dark:text-red-400" : "text-black/80 dark:text-white/80"
              }`}
            >
              {secondsLeft}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span>WPM</span>
            <span className="font-mono tabular-nums text-sm text-[#1D9E75]">{liveWpm}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span>Үг</span>
            <span className="font-mono tabular-nums text-sm text-black/80 dark:text-white/80">{correctWords}</span>
          </span>
        </div>
        <span className="hidden sm:inline">{phase === "idle" ? "Бичиж эхлэхэд цаг явна" : "Зай дарж дараагийн үг рүү"}</span>
      </div>

      {/* Challenge target */}
      {target ? (
        <div className="px-1">
          <div className="flex items-center justify-between text-[11px] text-black/50 dark:text-white/50 mb-1">
            <span>Давах бай: <span className="font-mono text-black/80 dark:text-white/80">{target} WPM</span></span>
            <span className="font-mono tabular-nums">{targetLine}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1D9E75] transition-[width] duration-300"
              style={{ width: `${targetLine ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Word stream */}
      <div
        className="
          rounded-xl
          bg-black/5 dark:bg-white/5
          border border-black/10 dark:border-white/10
          px-5 py-3
        "
      >
        {/* The clip box is exactly three lines tall, inside the padding, so a
            scrolled-away line never peeks through the top edge. */}
        <div className="overflow-hidden" style={{ height: LINE_HEIGHT * VISIBLE_LINES }}>
        <div
          ref={streamRef}
          className="flex flex-wrap gap-x-3 font-cyrillic text-2xl leading-[44px] transition-transform duration-200"
          style={{ transform: `translateY(-${scroll}px)` }}
          aria-hidden="true"
        >
          {words.map((word, i) => {
            const state = i < index ? (results[i] ? "done" : "wrong") : i === index ? "active" : "todo";
            return (
              <span
                key={`${i}-${word}`}
                data-active={state === "active"}
                className={
                  state === "done"
                    ? "text-black/35 dark:text-white/35"
                    : state === "wrong"
                    ? "text-red-500/70 line-through decoration-red-500/50"
                    : state === "active"
                    ? "text-black dark:text-white"
                    : "text-black/60 dark:text-white/55"
                }
              >
                {state === "active" ? <ActiveWord word={word} shown={shown} /> : word}
              </span>
            );
          })}
        </div>
        </div>
      </div>

      {/* The real input. Kept visible enough that phones open a keyboard. */}
      <input
        ref={inputRef}
        value={typed}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="next"
        aria-label="Бичих талбар"
        placeholder={mode === "cy" ? "sain → сайн" : mode === "en" ? "type here" : "энд бич"}
        className="
          w-full h-12 px-4 rounded-xl
          bg-black/5 dark:bg-white/5
          border border-black/10 dark:border-white/10
          font-mono text-base
          text-black/90 dark:text-white/90
          placeholder-black/30 dark:placeholder-white/25
          outline-none focus:border-[#1D9E75]/60
        "
      />
    </div>
  );
}

/** The current word with per-letter feedback under the caret. */
function ActiveWord({ word, shown }: { word: string; shown: string }) {
  const lowerShown = shown.toLowerCase();
  const lowerWord = word.toLowerCase();
  return (
    <span className="relative inline-block border-b-2 border-[#1D9E75]">
      {word.split("").map((ch, i) => {
        const typedCh = lowerShown[i];
        const cls =
          typedCh === undefined
            ? ""
            : typedCh === lowerWord[i]
            ? "text-[#1D9E75]"
            : "text-red-500 dark:text-red-400";
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
      {lowerShown.length > word.length && (
        <span className="text-red-500/70">{shown.slice(word.length)}</span>
      )}
    </span>
  );
}
