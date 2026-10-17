/**
 * Cyrillic → Latin.
 *
 * Two styles:
 *   typemon  what a TypeMon user would type to get the text back
 *            (q/w/'/yi, and `_` inserted wherever the plain spelling would
 *            not round-trip, e.g. Батсүх → Bat_swh). transliterate() of the
 *            result gives the input back.
 *   mns      MNS 5217:2012, the official romanization used on passports and
 *            road signs (ö/ü/kh/ts, й and ь as i).
 */

import { transliterate } from "./transliterate.ts";

export type LatinStyle = "typemon" | "mns";

const TYPEMON: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "q", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "w", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "''", ы: "yi", ь: "'", э: "e", ю: "yu", я: "ya",
};

const MNS: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo", ж: "j", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "ö", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "ü", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "i", ы: "y", ь: "i", э: "e", ю: "yu", я: "ya",
};

const VOWELS = "аоуүэиөеёюяы";
/** Vowels the engine has an <vowel>i diphthong rule for (ai oi ui wi ei ii). */
const DIPHTHONG_BASE = "аоуүэи";
const CYR_LOWER = /[а-яёөү]/;
const CYR_UPPER = /[А-ЯЁӨҮ]/;
const CYR = /[а-яёөүА-ЯЁӨҮ]/;

/** Lowercase Latin for one Cyrillic word (no case, no separators). */
function wordPieces(chars: string[], style: LatinStyle): string[] {
  const table = style === "mns" ? MNS : TYPEMON;
  return chars.map((c, i) => {
    if (style === "typemon" && c === "й") {
      // After а/о/у/ү/э/и and before a consonant it is the diphthong i the
      // engine knows (сайхан → saihan); elsewhere y (йогурт → yogurt,
      // музей → muzyey, since "yei" would read back as еи).
      const prev = chars[i - 1];
      const next = chars[i + 1];
      const afterBase = prev !== undefined && DIPHTHONG_BASE.includes(prev);
      const beforeVowel = next !== undefined && VOWELS.includes(next);
      return afterBase && !beforeVowel ? "i" : "y";
    }
    return table[c] ?? c;
  });
}

/**
 * Join the pieces of one word, inserting `_` wherever the digraph rules
 * would otherwise merge two letters (тс → t_s). Only for the typemon style,
 * whose point is to round-trip.
 */
function joinRoundTrip(cyrLower: string[], pieces: string[]): string {
  let latin = "";
  let cyrSoFar = "";
  for (let i = 0; i < pieces.length; i++) {
    cyrSoFar += cyrLower[i];
    const plain = latin + pieces[i];
    if (latin === "" || transliterate(plain, { builtInExceptions: false }) === cyrSoFar) {
      latin = plain;
    } else {
      latin = `${latin}_${pieces[i]}`;
    }
  }
  return latin;
}

function caseLike(latinLower: string, cyrWord: string): string {
  const letters = [...cyrWord].filter((c) => CYR.test(c));
  const upper = letters.filter((c) => CYR_UPPER.test(c)).length;
  if (upper === 0) return latinLower;
  if (upper === letters.length && letters.length >= 2) return latinLower.toUpperCase();
  if (CYR_UPPER.test(cyrWord[0])) {
    return latinLower.charAt(0).toUpperCase() + latinLower.slice(1);
  }
  return latinLower;
}

/**
 * Romanize Cyrillic text. Non-Cyrillic characters pass through unchanged.
 * Casing follows each word: ALL CAPS, Title case, or lowercase.
 */
export function toLatin(text: string, style: LatinStyle = "typemon"): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (!CYR.test(text[i])) {
      out += text[i];
      i++;
      continue;
    }
    let end = i;
    while (end < text.length && CYR.test(text[end])) end++;
    const word = text.slice(i, end);
    const lowerChars = [...word.toLowerCase()];
    const pieces = wordPieces(lowerChars, style);
    const latinLower = style === "typemon" ? joinRoundTrip(lowerChars, pieces) : pieces.join("");
    out += caseLike(latinLower, word);
    i = end;
  }
  return out;
}

/** True when `ch` is a Mongolian Cyrillic letter (either case). */
export function isCyrillicLetter(ch: string): boolean {
  return CYR_LOWER.test(ch) || CYR_UPPER.test(ch);
}
