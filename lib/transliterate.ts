/**
 * TypeMon — Mongolian Romanization to Cyrillic Transliterator
 *
 * Key mappings decided by Zaya:
 *   Q → Ө,  W → Ү
 *   J → Ж,  H → Х,  SH → Ш,  CH → Ч,  TS → Ц
 *   AI → АЙ, OI → ОЙ, UI → УЙ, WI → ҮЙ
 *   AA → АА (long vowels by doubling)
 *   YI → Ы
 *   ' → Ь,  '' → Ъ   (the curly ’ ‘ that phones insert count as ')
 *   _ between two letters → nothing; it keeps a digraph apart (unt_san → унтсан)
 */

type Mapping = [string, string];

/**
 * Multi-character mappings — order is critical (longest/most specific first).
 * All cyrillic values are lowercase; casing is applied dynamically.
 */
const MULTI_CHAR_MAP: Mapping[] = [
  ['shch', 'щ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['zh', 'ж'],
  ['ts', 'ц'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['yo', 'ё'],
  ['ye', 'е'],
  ['yi', 'ы'],
  ['aa', 'аа'],
  ['ee', 'ээ'],
  ['oo', 'оо'],
  ['qq', 'өө'],
  ['ww', 'үү'],
  ['ai', 'ай'],
  ['oi', 'ой'],
  ['ui', 'уй'],
  ['wi', 'үй'],
  ['ei', 'эй'],
  ['ii', 'ий'],
  ['uu', 'уу'],
];

/**
 * Single-character mappings.
 * Keys are lowercase latin; values are lowercase cyrillic.
 */
const SINGLE_CHAR_MAP: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'э',
  j: 'ж', z: 'з', i: 'и', y: 'й', k: 'к', l: 'л',
  m: 'м', n: 'н', o: 'о', q: 'ө', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', w: 'ү',
  x: 'х', c: 'ц',
};

/** Straight apostrophe plus the curly quotes iOS/Android "smart punctuation" substitutes for it. */
const APOSTROPHES = new Set(["'", '’', '‘']);

/** Typed between two letters to stop them forming a digraph. Dropped from the output. */
const SEPARATOR = '_';

const isLatinLetter = (ch: string | undefined): boolean =>
  ch !== undefined && /[a-zA-Z]/.test(ch);

const isWordChar = (ch: string | undefined): boolean =>
  ch !== undefined && (isLatinLetter(ch) || APOSTROPHES.has(ch) || ch === SEPARATOR);

/**
 * Apply casing from the original romanized slice to the cyrillic output.
 * - All uppercase input  → all uppercase output   (SAIN → САЙН)
 * - First letter uppercase → first letter uppercase (Sain → Сайн)
 * - All lowercase → all lowercase                  (sain → сайн)
 */
function applyCase(cyrLower: string, origSlice: string): string {
  const hasLetter = /[a-zA-Z]/.test(origSlice);
  if (!hasLetter) return cyrLower;

  const allUpper = !/[a-z]/.test(origSlice) && /[A-Z]/.test(origSlice);
  if (allUpper) return cyrLower.toUpperCase();

  const firstUpper = /[A-Z]/.test(origSlice[0]);
  if (firstUpper) return cyrLower.charAt(0).toUpperCase() + cyrLower.slice(1);

  return cyrLower;
}

/**
 * Is the word starting at `start` written in ALL CAPS?
 * Needs at least two letters so that a lone capital ("A", "I") stays title case.
 * Decides the case of Ь/Ъ, which have no letter of their own in the input.
 */
function isAllCapsWord(text: string, start: number): boolean {
  let letters = 0;
  for (let j = start; j < text.length && isWordChar(text[j]); j++) {
    const ch = text[j];
    if (/[a-z]/.test(ch)) return false;
    if (/[A-Z]/.test(ch)) letters++;
  }
  return letters >= 2;
}

/**
 * Convert a chunk of latin text into cyrillic.
 * Internal helper — does NOT understand the *...* escape syntax.
 */
function transliterateChunk(text: string): string {
  let result = '';
  let i = 0;
  // ASCII-only lowercase keeps indices aligned with `text`
  // (String#toLowerCase can change the length for letters like İ).
  const lower = text.replace(/[A-Z]/g, (c) => c.toLowerCase());
  let wordUpper = false;

  while (i < text.length) {
    const ch = text[i];

    // Word boundary: decide once per word whether it is ALL CAPS.
    if (isWordChar(ch) && !isWordChar(text[i - 1])) {
      wordUpper = isAllCapsWord(text, i);
    }

    // Separator between two letters: drop it, nothing else.
    if (ch === SEPARATOR) {
      if (!(isLatinLetter(text[i - 1]) && isLatinLetter(text[i + 1]))) result += ch;
      i++;
      continue;
    }

    // '' → Ъ, ' → Ь (in any mix of straight and curly apostrophes)
    if (APOSTROPHES.has(ch)) {
      if (APOSTROPHES.has(text[i + 1])) {
        result += wordUpper ? 'Ъ' : 'ъ';
        i += 2;
      } else {
        result += wordUpper ? 'Ь' : 'ь';
        i++;
      }
      continue;
    }

    // Try multi-character mappings first
    let matched = false;
    for (const [rom, cyr] of MULTI_CHAR_MAP) {
      const len = rom.length;
      if (lower.slice(i, i + len) === rom) {
        result += wordUpper ? cyr.toUpperCase() : applyCase(cyr, text.slice(i, i + len));
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const cyr = SINGLE_CHAR_MAP[lower[i]];
      result += cyr ? applyCase(cyr, ch) : ch;
      i++;
    }
  }

  return result;
}

/** A segment of the transliterated output. */
export type Segment = {
  /** The text to render. */
  text: string;
  /** Whether this segment was inside *...* and kept as-is (latin). */
  literal: boolean;
};

/**
 * Transliterate romanized Mongolian into Cyrillic, with `*...*` escape syntax.
 * Anything wrapped in matching `*` is returned verbatim (latin preserved).
 * If a `*` has no matching closing `*`, it is treated as a normal character
 * and the surrounding text is still transliterated.
 *
 * Returns an array of segments so the UI can highlight literal sections.
 */
export function transliterateSegments(text: string): Segment[] {
  const segments: Segment[] = [];

  // Find all matched *...* pairs. Greedy from left.
  // We deliberately do NOT match across multiple lines if a closing * is missing.
  let i = 0;
  while (i < text.length) {
    const star = text.indexOf('*', i);
    if (star === -1) {
      // No more stars — transliterate the rest.
      const tail = text.slice(i);
      if (tail) segments.push({ text: transliterateChunk(tail), literal: false });
      break;
    }

    // Look for a matching closing *
    const close = text.indexOf('*', star + 1);
    if (close === -1) {
      // Unmatched opening * — transliterate everything (including the *).
      const tail = text.slice(i);
      if (tail) segments.push({ text: transliterateChunk(tail), literal: false });
      break;
    }

    // Convert text before the opening *
    if (star > i) {
      segments.push({ text: transliterateChunk(text.slice(i, star)), literal: false });
    }

    // Literal content between * and * (excluding the stars themselves)
    const inner = text.slice(star + 1, close);
    if (inner.length > 0) {
      segments.push({ text: inner, literal: true });
    }
    // else: empty `**` — silently drop

    i = close + 1;
  }

  return segments;
}

/**
 * Transliterate romanized Mongolian text to Cyrillic.
 * Preserves spaces, newlines, punctuation, and digits as-is.
 * Supports `*latin*` escape syntax to keep latin words verbatim.
 *
 * @example
 * transliterate('Sain baina uu')               // → 'Сайн байна уу'
 * transliterate('MONGOL')                      // → 'МОНГОЛ'
 * transliterate("gov'")                        // → 'говь'
 * transliterate('mongolyin')                   // → 'монголын'
 * transliterate('unt_san')                     // → 'унтсан'
 * transliterate('Minii mergejil *Programmer*') // → 'Миний мэргэжил Programmer'
 */
export function transliterate(text: string): string {
  return transliterateSegments(text).map((s) => s.text).join('');
}
