import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import PlusPlans from "@/components/PlusPlans";
import { POLISH_CHARS, POLISH_LIMIT } from "@/lib/plan-constants";

export const metadata: Metadata = {
  title: "TypeMon Plus — сард 1,000 AI засвар",
  description: "Сард 1,000 удаа, 2,000 тэмдэгт хүртэл AI засвар. Өнгө аяс сонгох, өөрийн бичих дүрэм. 6,900₮/сар.",
  alternates: { canonical: "https://type-mon.vercel.app/plus" },
};

const rows: { label: string; guest: string; free: string; plus: string }[] = [
  { label: "Латин → Кирилл хөрвүүлэлт", guest: "Хязгааргүй", free: "Хязгааргүй", plus: "Хязгааргүй" },
  { label: "AI засвар", guest: `Өдөрт ${POLISH_LIMIT.guest}`, free: `Сард ${POLISH_LIMIT.free}`, plus: `Сард ${POLISH_LIMIT.plus.toLocaleString("en-US")}` },
  { label: "Нэг удаагийн урт", guest: `${POLISH_CHARS.guest} тэмдэгт`, free: `${POLISH_CHARS.free} тэмдэгт`, plus: `${POLISH_CHARS.plus.toLocaleString("en-US")} тэмдэгт` },
  { label: "Өнгө аяс сонгох (албан / энгийн / богино)", guest: "—", free: "—", plus: "✓" },
  { label: "Өөрийн бичих дүрэм", guest: "—", free: "—", plus: "✓" },
  { label: "Хурдны тест, түүх, офлайн", guest: "✓", free: "✓", plus: "✓" },
];

const faq: { q: string; a: string }[] = [
  { q: "Яаж төлөх вэ?", a: "QPay-ээр — банкныхаа аппаар QR уншуулна. Карт бүртгүүлэх шаардлагагүй." },
  { q: "Цуцлахад юу болох вэ?", a: "Төлсөн хугацаа дуустал Plus хэвээр үлдэнэ, дараа нь автоматаар үнэгүй багц руу буцна. Юу ч устахгүй." },
  { q: "Миний бичсэн текст хадгалагдах уу?", a: "Засварлах текст сервер дээр хадгалагдахгүй; зөвхөн хэдэн удаа, хэдэн токен ашигласныг тоолно. Түүх таны төхөөрөмж дээр л байдаг." },
  { q: "Сарын 1,000 засвар хүрэхгүй бол?", a: "Хүрэхгүй хүн бараг байхгүй — өдөрт 33 удаа гэсэн үг. Хэрвээ бодит хэрэгцээ гарвал бичээрэй, тохиролцоно." },
];

export default function PlusPage() {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-4xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-8 md:mb-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-light tracking-tight text-2xl">
              Type<span className="text-[#1D9E75]">Mon</span>
              <span className="ml-2 text-base text-[#1D9E75]">Plus</span>
            </Link>
            <div className="flex items-center gap-3">
              <AccountMenu />
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-5 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-black dark:text-white leading-tight">
              AI засварыг хэрэгтэй хэмжээгээрээ.
            </h1>
            <p className="mt-3 text-base text-black/70 dark:text-white/70">
              Хөрвүүлэлт үнэгүй хэвээр. Plus бол урт текст, олон удаа, өөрийн хэв маягаар засуулах хүмүүст.
            </p>
          </div>
        </header>

        <PlusPlans />

        <section className="mt-10">
          <h2 className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-3 px-1">Харьцуулалт</h2>
          <div className="overflow-x-auto rounded-2xl border border-black/8 dark:border-white/10 bg-[#eeede8] dark:bg-[#242424]">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  <th className="text-left font-medium px-4 py-3">&nbsp;</th>
                  <th className="text-left font-medium px-4 py-3">Зочин</th>
                  <th className="text-left font-medium px-4 py-3">Нэвтэрсэн</th>
                  <th className="text-left font-medium px-4 py-3 text-[#1D9E75]">Plus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-black/8 dark:border-white/10">
                    <th className="text-left font-normal px-4 py-3 text-black/80 dark:text-white/80">{row.label}</th>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{row.guest}</td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{row.free}</td>
                    <td className="px-4 py-3 text-[#1D9E75] font-medium">{row.plus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 max-w-2xl">
          <h2 className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-3 px-1">Асуулт</h2>
          <div className="divide-y divide-black/8 dark:divide-white/10">
            {faq.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-medium text-black/90 dark:text-white/90">
                  {item.q}
                  <span className="text-[#1D9E75] group-open:rotate-45 transition-transform duration-150">+</span>
                </summary>
                <p className="mt-2 text-sm text-black/65 dark:text-white/65 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-10 md:mt-12 text-xs text-black/50 dark:text-white/50 text-center">
          <Link href="/" className="hover:text-[#1D9E75] transition-colors duration-150">← Хөрвүүлэгч рүү буцах</Link>
        </footer>
      </div>
    </main>
  );
}
