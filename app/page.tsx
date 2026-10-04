"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TypeMonEditor from "@/components/TypeMonEditor";
import HistoryPanel, { type HistoryItem } from "@/components/HistoryPanel";
import ThemeToggle from "@/components/ThemeToggle";

const URL_TEXT_MAX = 2000;

function HomeInner() {
  const searchParams = useSearchParams();
  // ?text=... is read once, during the first render. The effect below only
  // strips it from the address bar so a reload starts clean.
  const [initialRoman, setInitialRoman] = useState(
    () => searchParams?.get("text")?.slice(0, URL_TEXT_MAX) ?? ""
  );
  // Bumped to remount the editor with a new `initialRoman`.
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    if (!searchParams?.get("text")) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("text");
      const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
      window.history.replaceState({}, "", cleaned);
    } catch {
      /* swallow */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoad = useCallback((item: HistoryItem) => {
    setInitialRoman(item.polished ?? item.cyrillic ?? item.roman);
    setLoadToken((t) => t + 1);
  }, []);

  return (
    <main
      className="
        flex-1 w-full min-h-screen
        bg-[#f5f4ef] text-black/90
        dark:bg-[#1a1a1a] dark:text-white/90
        transition-colors duration-200
      "
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8 py-7 md:py-10">
        {/* Logo / header */}
        <header className="mb-7 md:mb-9">
          <div className="flex items-center justify-between">
            <h1 className="font-light tracking-tight text-2xl">
              Type<span className="text-[#1D9E75]">Mon</span>
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/wpm"
                className="
                  inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg
                  border border-[#1D9E75]/50 text-[#1D9E75] text-sm
                  hover:bg-[#1D9E75]/10 transition-colors duration-150
                "
                title="60 секундын бичих хурдны тест"
              >
                ⚡ <span className="hidden sm:inline">Хурдаа шалгах</span><span className="sm:hidden">Хурд</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-4 md:mt-5 max-w-xl">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight text-black dark:text-white leading-tight">
              Латинаар бичиж, Кириллээр илгээ.
            </h2>
            <p className="mt-3 text-sm text-black/70 dark:text-white/70">
              <span className="font-mono text-black/90 dark:text-white/90">Sain baina uu</span>
              <span className="text-black/50 dark:text-white/50"> → </span>
              <span className="text-[#1D9E75]">Сайн байна уу</span>
            </p>
          </div>
        </header>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-9">
          <section
            className="
              bg-[#eeede8] dark:bg-[#242424]
              border border-black/8 dark:border-white/10
              rounded-2xl
              p-4 md:p-6
              backdrop-blur-sm
              transition-colors duration-200
            "
          >
            <TypeMonEditor key={loadToken} initialRoman={initialRoman} />
          </section>

          <section
            className="
              bg-[#eae9e2] dark:bg-[#262626]
              border border-black/8 dark:border-white/10
              rounded-2xl
              p-5
              backdrop-blur-sm
              h-fit
              transition-colors duration-200
            "
          >
            <HistoryPanel onLoad={handleLoad} />
          </section>
        </div>

        <footer className="mt-9 md:mt-12 text-xs text-black/50 dark:text-white/50 text-center">
          Латинаар бичээд дассан Монголчуудад зориулав · Built by{" "}
          <a
            href="https://www.ezaya.dev/mn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black/70 hover:text-[#1D9E75] dark:text-white/70 dark:hover:text-[#1D9E75] transition-colors duration-150"
          >
            Zaya
          </a>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] dark:bg-[#1a1a1a]" />
      }
    >
      <HomeInner />
    </Suspense>
  );
}
