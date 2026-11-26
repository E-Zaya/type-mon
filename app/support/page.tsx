import type { Metadata } from "next";
import LegalPage, { CONTACT_URL, type LegalLang } from "@/components/app-legal/LegalPage";

export const metadata: Metadata = {
  title: "TypeMon — Support",
  description: "Help and contact for the TypeMon iPhone app and keyboard.",
  alternates: { canonical: "https://type-mon.vercel.app/support" },
};

const LANGS: LegalLang[] = [
  {
    lang: "mn",
    label: "Монгол",
    title: "Тусламж",
    sections: [
      { heading: "Гарыг асаах", body: ["Тохиргоо → Ерөнхий → Гар → Гарууд → Шинэ гар нэмэх → TypeMon."] },
      { heading: "Гар солих", body: ["Бичих үед 🌐 товчийг дарж TypeMon руу шилжинэ."] },
      { heading: "Асуулт, алдааны мэдээлэл", body: ["Доорх маягтаар бичнэ үү. Нэг хүн хариулдаг тул хэдэн өдөр болж магадгүй.", CONTACT_URL] },
    ],
  },
  {
    lang: "en",
    label: "English",
    title: "Support",
    sections: [
      { heading: "Turn on the keyboard", body: ["Settings → General → Keyboard → Keyboards → Add New Keyboard → TypeMon."] },
      { heading: "Switch keyboards", body: ["While typing, tap the 🌐 key to switch to TypeMon."] },
      { heading: "Questions and bug reports", body: ["Use the form below. One person answers, so replies can take a few days.", CONTACT_URL] },
    ],
  },
  {
    lang: "ja",
    label: "日本語",
    title: "サポート",
    sections: [
      { heading: "キーボードを有効にする", body: ["設定 → 一般 → キーボード → キーボード → 新しいキーボードを追加 → TypeMon。"] },
      { heading: "キーボードを切り替える", body: ["入力中に 🌐 キーを押して TypeMon に切り替えます。"] },
      { heading: "質問・不具合の連絡", body: ["下のフォームからどうぞ。1人で対応しているため、返信に数日かかることがあります。", CONTACT_URL] },
    ],
  },
];

export default function SupportPage() {
  return <LegalPage subtitle="Support" langs={LANGS} updated="2026-11-26" />;
}
