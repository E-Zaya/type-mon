import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export type LegalSection = { heading: string; body: string[] };
export type LegalLang = { lang: "mn" | "en" | "ja"; label: string; title: string; sections: LegalSection[] };

export const CONTACT_URL = "https://ezaya.dev/en/contact";

export default function LegalPage({ subtitle, langs, updated }: { subtitle: string; langs: LegalLang[]; updated: string }) {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-2xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="font-light tracking-tight text-2xl">
            Type<span className="text-[#1D9E75]">Mon</span>
            <span className="ml-2 text-base text-black/50 dark:text-white/50">{subtitle}</span>
          </Link>
          <ThemeToggle />
        </header>
        <nav className="mb-8 flex gap-4 text-sm text-black/60 dark:text-white/60">
          {langs.map((l) => (
            <a key={l.lang} href={`#${l.lang}`} className="hover:text-[#1D9E75]">{l.label}</a>
          ))}
        </nav>
        {langs.map((l) => (
          <section key={l.lang} id={l.lang} lang={l.lang} className="mb-12 scroll-mt-6">
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-black dark:text-white">{l.title}</h1>
            {l.sections.map((s) => (
              <div key={s.heading} className="mt-6">
                <h2 className="text-base font-medium text-black dark:text-white">{s.heading}</h2>
                {s.body.map((p) => (
                  <p key={p} className="mt-2 text-sm leading-relaxed text-black/75 dark:text-white/75">
                    {p.startsWith("https://") ? <a href={p} className="text-[#1D9E75] underline">{p}</a> : p}
                  </p>
                ))}
              </div>
            ))}
          </section>
        ))}
        <p className="text-xs text-black/50 dark:text-white/50">{updated}</p>
      </div>
    </main>
  );
}
