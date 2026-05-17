import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://type-mon.vercel.app'),
  title: 'TypeMon — Латин үсгээр бичиж, Кириллээр илгээ',
  description: 'Латин үсгээр бичвэл Кирилл болгоно. SAINUU → САЙНУУ. Монголчуудад зориулсан үнэгүй хэрэгсэл.',
  keywords: [
    'mongoloor bichih',
    'mongol bichig',
    'кирилл бичих',
    'latin to cyrillic mongolian',
    'mongolian cyrillic converter',
    'монгол кирилл',
    'TypeMon',
  ],
  alternates: {
    canonical: 'https://type-mon.vercel.app',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'TypeMon — Mongoloor bichih',
    description: 'Латин үсгээр бичвэл Кирилл болгоно. SAINUU → САЙНУУ. Монголчуудад зориулсан үнэгүй хэрэгсэл.',
    url: 'https://type-mon.vercel.app',
    type: 'website',
    images: [{ url: '/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeMon — Mongoloor bichih',
    description: 'Латин үсгээр бичвэл Кирилл болгоно. Монголчуудад зориулсан үнэгүй хэрэгсэл.',
    images: ['/og'],
  },
};

/**
 * Inline script that runs BEFORE React hydration to set the theme class on <html>.
 * Prevents a flash of the wrong theme on first paint.
 * Default theme is "dark".
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('typemon-theme');
    var theme = stored === 'light' ? 'light' : 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="mn"
      // Default to dark on the server; the inline script will fix it before paint.
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'TypeMon',
              description: 'Mongolian Latin to Cyrillic converter',
              url: 'https://type-mon.vercel.app',
              applicationCategory: 'UtilitiesApplication',
              inLanguage: 'mn',
              offers: { '@type': 'Offer', price: '0' },
            }),
          }}
        />
        <ServiceWorkerRegister />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
