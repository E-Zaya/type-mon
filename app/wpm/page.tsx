import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import WpmGame from "@/components/wpm/WpmGame";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "TypeMon Хурд — 60 секундын бичих хурдны тест",
  description:
    "Кирилл эсвэл англиар 60 секунд бичээд WPM-ээ мэд. Тэмээ, морь, бүргэд, өртөөний элч — чи аль нь вэ? Найзуудтайгаа хуваалц.",
  alternates: { canonical: "https://type-mon.vercel.app/wpm" },
  openGraph: {
    title: "TypeMon Хурд — чи минутанд хэдэн үг бичдэг вэ?",
    description: "60 секунд. Кирилл эсвэл англи. Үр дүнгээ хуваалцаад найзуудаа сорь.",
    url: "https://type-mon.vercel.app/wpm",
    type: "website",
    images: [{ url: "/og/wpm", width: 1200, height: 630 }],
  },
};

export default function WpmPage() {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-7 md:mb-9">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-light tracking-tight text-2xl">
              Type<span className="text-[#1D9E75]">Mon</span>
              <span className="ml-2 text-base text-black/50 dark:text-white/50">Хурд</span>
            </Link>
            <ThemeToggle />
          </div>
          <div className="mt-4 md:mt-5 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-black dark:text-white leading-tight">
              60 секундэд хэдэн үг бичих вэ?
            </h1>
            <p className="mt-3 text-sm text-black/70 dark:text-white/70">
              Бичиж эхлэхэд цаг явна. Дуусахад цол, харьцуулалт, хуваалцах холбоос.
            </p>
          </div>
        </header>

        <section
          className="
            bg-[#eeede8] dark:bg-[#242424]
            border border-black/8 dark:border-white/10
            rounded-2xl p-4 md:p-6
            transition-colors duration-200
          "
        >
          <Suspense fallback={<div className="h-64" />}>
            <WpmGame />
          </Suspense>
        </section>

        <footer className="mt-9 md:mt-12 text-xs text-black/50 dark:text-white/50 text-center">
          WPM = зөв бичсэн тэмдэгт ÷ 5. Өдөр бүр нэг үгийн багц — найзуудтайгаа адил нөхцөлд.{" "}
          <Link href="/" className="text-black/70 hover:text-[#1D9E75] dark:text-white/70 dark:hover:text-[#1D9E75] transition-colors duration-150">
            Хөрвүүлэгч рүү буцах
          </Link>
        </footer>
      </div>
    </main>
  );
}
