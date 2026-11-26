import type { Metadata } from "next";
import LegalPage, { CONTACT_URL, type LegalLang } from "@/components/app-legal/LegalPage";

export const metadata: Metadata = {
  title: "TypeMon — Privacy Policy",
  description: "TypeMon iPhone app privacy policy. The app and keyboard collect no personal data.",
  alternates: { canonical: "https://type-mon.vercel.app/privacy" },
};

const LANGS: LegalLang[] = [
  {
    lang: "mn",
    label: "Монгол",
    title: "Нууцлалын бодлого",
    sections: [
      { heading: "Хамрах хүрээ", body: ["Энэ бодлого нь iPhone-ын TypeMon апп болон TypeMon гарт хамаарна."] },
      { heading: "Цуглуулдаг мэдээлэл", body: ["Бид ямар ч хувийн мэдээлэл цуглуулдаггүй. Бүртгэл, зар сурталчилгаа, хэрэглээг хянах хэрэгсэл байхгүй."] },
      { heading: "Таны бичсэн зүйл", body: ["Гар нь \"Full Access\" хүсдэггүй тул интернэтэд холбогдож чадахгүй. Таны бичсэн үг зөвхөн таны iPhone дээр хувиргагдана. \"Миний үгс\" болон тохиргоо нь зөвхөн таны төхөөрөмж дотор хадгалагдана."] },
      { heading: "Гуравдагч этгээд", body: ["Мэдээллийг хэнд ч дамжуулдаггүй, зардаггүй."] },
      { heading: "Устгах", body: ["Аппыг устгавал төхөөрөмж дээрх бүх өгөгдөл хамт устна."] },
      { heading: "Холбоо барих", body: [CONTACT_URL] },
    ],
  },
  {
    lang: "en",
    label: "English",
    title: "Privacy Policy",
    sections: [
      { heading: "Scope", body: ["This policy covers the TypeMon iPhone app and the TypeMon keyboard."] },
      { heading: "Data we collect", body: ["None. There is no account, no advertising and no analytics or tracking."] },
      { heading: "What you type", body: ["The keyboard does not ask for Full Access, so it cannot reach the internet. Conversion happens only on your iPhone. Your word list (\"Миний үгс\") and settings are stored only on your device."] },
      { heading: "Third parties", body: ["We do not share or sell any data."] },
      { heading: "Deleting data", body: ["Deleting the app removes all of its data from your device."] },
      { heading: "Contact", body: [CONTACT_URL] },
    ],
  },
  {
    lang: "ja",
    label: "日本語",
    title: "プライバシーポリシー",
    sections: [
      { heading: "対象", body: ["iPhone アプリ TypeMon と TypeMon キーボードが対象です。"] },
      { heading: "集める情報", body: ["個人情報は一切集めません。アカウント、広告、利用状況の解析・追跡はありません。"] },
      { heading: "入力した文字", body: ["キーボードは「フルアクセス」を求めないため、インターネットにつながりません。変換は iPhone の中だけで行います。「Миний үгс」(自分の辞書) と設定は端末の中だけに保存します。"] },
      { heading: "第三者への提供", body: ["データを第三者に渡したり売ったりしません。"] },
      { heading: "削除", body: ["アプリを削除すると、端末のデータもすべて消えます。"] },
      { heading: "お問い合わせ", body: [CONTACT_URL] },
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage subtitle="Privacy" langs={LANGS} updated="2026-11-26" />;
}
