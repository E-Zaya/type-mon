/**
 * Turning a number into something worth sharing.
 *
 * A raw WPM means little to most people; a title does. The ladder is built
 * from Mongolian symbols of speed — camel, goat, horse, Naadam racehorse,
 * eagle, and the Örtöö relay rider who carried the Khan's mail across the
 * empire faster than anything alive.
 */

import type { WpmMode } from "@/lib/wpm-words";

export type WpmResult = {
  mode: WpmMode;
  wpm: number;
  /** 0–100, whole percent. */
  accuracy: number;
  /** Characters of correctly typed words (including the space after each). */
  chars: number;
  /** Correct words. */
  words: number;
  /** Wrong words. */
  mistakes: number;
  /** YYYYMMDD of the session. */
  day: number;
};

export type Tier = {
  id: string;
  min: number;
  emoji: string;
  /** Title in Mongolian. */
  name: string;
  /** One line about what that speed feels like. */
  line: string;
};

export const TIERS: Tier[] = [
  { id: "camel", min: 0, emoji: "🐫", name: "Тэмээ", line: "Яарахгүй. Гэхдээ говийг гатална." },
  { id: "goat", min: 20, emoji: "🐐", name: "Ямаа", line: "Хадан дээр ч зогсдоггүй." },
  { id: "horse", min: 35, emoji: "🐎", name: "Морь", line: "Дундаж монгол хүн энд явдаг." },
  { id: "racer", min: 50, emoji: "🏇", name: "Наадмын хурдан морь", line: "Түрүү магнай хүртэл ганц алхам." },
  { id: "eagle", min: 70, emoji: "🦅", name: "Бүргэд", line: "Олзоо харсан бол шууд." },
  { id: "courier", min: 90, emoji: "⚡", name: "Өртөөний элч", line: "Их хааны захиаг хүргэдэг хурд. Эзэнт гүрний хамгийн хурдан." },
];

export function tierFor(wpm: number): Tier {
  let tier = TIERS[0];
  for (const t of TIERS) if (wpm >= t.min) tier = t;
  return tier;
}

export function nextTier(wpm: number): Tier | null {
  return TIERS.find((t) => t.min > wpm) ?? null;
}

/* Rough population curves. These are estimates used only for the "faster
   than X%" line — a real distribution replaces them once results are stored. */
const CURVE: Record<WpmMode, { mean: number; sd: number }> = {
  cy: { mean: 30, sd: 13 },
  cyk: { mean: 36, sd: 14 },
  en: { mean: 41, sd: 15 },
};

function normalCdf(z: number): number {
  // Abramowitz–Stegun approximation, plenty for a whole-percent display.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Whole-percent share of players this speed beats (estimated). */
export function percentile(wpm: number, mode: WpmMode): number {
  const { mean, sd } = CURVE[mode];
  const p = Math.round(normalCdf((wpm - mean) / sd) * 100);
  return Math.min(99, Math.max(1, p));
}

/**
 * Comparisons. Each takes the speed and returns a sentence; the caller picks
 * one by seed so a re-share of the same result reads the same.
 */
const QUIPS: ((wpm: number, chars: number) => string)[] = [
  (wpm) => {
    // The Secret History of the Mongols runs to roughly 60,000 words.
    const hours = Math.max(1, Math.round(60000 / (wpm * 60)));
    return `Энэ хурдаараа «Монголын нууц товчоо»-г ${hours} цагт шивж дуусгана.`;
  },
  (wpm) => `Хурдан морь 1 км давхих хооронд ${Math.round(wpm * 2)} үг бичнэ.`,
  (_, chars) => `Минутанд ${chars} тэмдэгт — ${Math.max(1, Math.round(chars / 90))} Facebook пост.`,
  (wpm) => `Ээж аавынхаа мессежээс ${Math.max(1, Math.round((wpm / 14) * 10) / 10)} дахин хурдан.`,
  (wpm) => `${Math.round(wpm * 60 * 8)} үг — өдөрт нэг богино роман.`,
  (wpm) => `Морин хуурч аяа эхлэх хооронд ${Math.max(1, Math.round(wpm / 4))} үг.`,
];

export function quip(result: WpmResult, seed = 0): string {
  const i = Math.abs((result.wpm * 31 + result.day + seed) | 0) % QUIPS.length;
  return QUIPS[i](Math.max(1, result.wpm), Math.max(1, result.chars));
}

/** A line about style, from accuracy. */
export function style(accuracy: number): string {
  if (accuracy >= 97) return "Нэг ч үсэг алддаггүй уран дархан.";
  if (accuracy >= 90) return "Хурдан бас цэвэрхэн.";
  if (accuracy >= 80) return "Хурдан, гэхдээ заримдаа мориноос унадаг. Босдог.";
  return "Хурд бий. Нарийвчлал дараа нь ирнэ.";
}

const MODE_KEYS: WpmMode[] = ["cy", "cyk", "en"];

export function isMode(value: unknown): value is WpmMode {
  return typeof value === "string" && (MODE_KEYS as string[]).includes(value);
}

/** Query string for a share/result URL. Short keys keep links small. */
export function encodeResult(r: WpmResult): string {
  const p = new URLSearchParams({
    m: r.mode,
    w: String(r.wpm),
    a: String(r.accuracy),
    c: String(r.chars),
    k: String(r.words),
    x: String(r.mistakes),
    d: String(r.day),
  });
  return p.toString();
}

type Params = Record<string, string | string[] | undefined>;

function int(value: string | string[] | undefined, max: number): number | null {
  const s = Array.isArray(value) ? value[0] : value;
  if (s === undefined || !/^\d{1,8}$/.test(s)) return null;
  const n = Number(s);
  return n > max ? null : n;
}

/** Parses a result out of query params; null when anything is off. */
export function decodeResult(params: Params): WpmResult | null {
  const modeRaw = Array.isArray(params.m) ? params.m[0] : params.m;
  if (!isMode(modeRaw)) return null;
  const wpm = int(params.w, 400);
  const accuracy = int(params.a, 100);
  const chars = int(params.c, 3000);
  const words = int(params.k, 600);
  const mistakes = int(params.x, 600);
  const day = int(params.d, 99991231);
  if (wpm === null || accuracy === null || chars === null || words === null || mistakes === null || day === null) return null;
  return { mode: modeRaw, wpm, accuracy, chars, words, mistakes, day };
}

export function modeLabel(mode: WpmMode): string {
  return mode === "en" ? "English" : mode === "cyk" ? "Кирилл · шууд" : "Кирилл · TypeMon";
}
