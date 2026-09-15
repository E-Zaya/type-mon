import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ResultCard from "@/components/wpm/ResultCard";
import ThemeToggle from "@/components/ThemeToggle";
import { decodeResult, encodeResult, percentile, tierFor } from "@/lib/wpm-rank";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/* The share landing page: a friend's result, then one button to try to beat
   it. Everything is in the URL, so there is nothing to look up. */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const result = decodeResult(await searchParams);
  if (!result) return { title: "TypeMon Хурд" };
  const tier = tierFor(result.wpm);
  const pct = percentile(result.wpm, result.mode);
  const title = `${tier.emoji} ${result.wpm} WPM — ${tier.name}`;
  const description = `Монголчуудын ${pct}%-иас хурдан. 60 секундэд ${result.words} үг. Чи давж чадах уу?`;
  // Relative on purpose: metadataBase in the root layout resolves it, so
  // preview deployments get a working card too.
  const image = `/og/wpm?${encodeResult(result)}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/wpm/r?${encodeResult(result)}`, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedResultPage({ searchParams }: { searchParams: SearchParams }) {
  const result = decodeResult(await searchParams);
  if (!result) redirect("/wpm");

  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-7 md:mb-9 flex items-center justify-between">
          <Link href="/" className="font-light tracking-tight text-2xl">
            Type<span className="text-[#1D9E75]">Mon</span>
            <span className="ml-2 text-base text-black/50 dark:text-white/50">Хурд</span>
          </Link>
          <ThemeToggle />
        </header>

        <p className="mb-4 text-sm text-black/60 dark:text-white/60">Найзын чинь үр дүн:</p>
        <ResultCard result={result} visitor />

        <footer className="mt-9 md:mt-12 text-xs text-black/50 dark:text-white/50 text-center">
          <Link href="/wpm" className="text-black/70 hover:text-[#1D9E75] dark:text-white/70 dark:hover:text-[#1D9E75] transition-colors duration-150">
            Өөрийнхөө хурдыг шалгах →
          </Link>
        </footer>
      </div>
    </main>
  );
}
