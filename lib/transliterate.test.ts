import { test } from "node:test";
import assert from "node:assert/strict";
import { transliterate, transliterateSegments } from "./transliterate.ts";
import { MN_WORDS } from "./wpm-words.ts";

/** Cyrillic → the Latin a TypeMon user would type (reverse of the main table). */
const REVERSE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "q", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "w", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "''", ы: "yi", ь: "'", э: "e", ю: "yu", я: "ya",
};
const toLatin = (word: string) => [...word].map((c) => REVERSE[c] ?? c).join("");

test("README examples", () => {
  assert.equal(transliterate("Sain baina uu"), "Сайн байна уу");
  assert.equal(transliterate("MONGOL"), "МОНГОЛ");
  assert.equal(transliterate("gov'"), "говь");
  assert.equal(transliterate("Minii mergejil *Programmer*"), "Миний мэргэжил Programmer");
});

test("every word of the typing-test corpus round-trips", () => {
  const failures = MN_WORDS.filter((w) => transliterate(toLatin(w)) !== w);
  assert.deepEqual(failures, []);
});

test("digraphs and long vowels", () => {
  assert.equal(transliterate("bayarlalaa"), "баярлалаа");
  assert.equal(transliterate("yaagaad"), "яагаад");
  assert.equal(transliterate("qnqqdqr"), "өнөөдөр");
  assert.equal(transliterate("wgwi"), "үгүй");
  assert.equal(transliterate("heregtei"), "хэрэгтэй");
  assert.equal(transliterate("tsetserleg"), "цэцэрлэг");
  assert.equal(transliterate("shine"), "шинэ");
  assert.equal(transliterate("borshch"), "борщ");
  assert.equal(transliterate("yum"), "юм");
  assert.equal(transliterate("goyo"), "гоё");
  assert.equal(transliterate("yerqnhii"), "ерөнхий");
});

test("ы is typed as yi", () => {
  assert.equal(transliterate("mongolyin"), "монголын");
  assert.equal(transliterate("ulsyin"), "улсын");
  assert.equal(transliterate("Yi"), "Ы");
  assert.equal(transliterate("MONGOLYIN"), "МОНГОЛЫН");
  // ы followed by й still works
  assert.equal(transliterate("yiy"), "ый");
});

test("ö and ü (MNS romanization) work like q and w", () => {
  assert.equal(transliterate("Mönh"), "Мөнх");
  assert.equal(transliterate("önöödör"), "өнөөдөр");
  assert.equal(transliterate("ügüi"), "үгүй");
  assert.equal(transliterate("ÜNEN"), "ҮНЭН");
  assert.equal(transliterate("Ö"), "Ө");
  assert.equal(transliterate("GOV’ ÜÜ"), "ГОВЬ ҮҮ");
  // Decomposed input (o + combining diaeresis) is composed first
  assert.equal(transliterate("mönh"), "мөнх");
  // ...but literal sections are returned byte-for-byte
  assert.equal(transliterate("*ö*"), "ö");
  // Still a letter for the separator rule
  assert.equal(transliterate("ö_i"), "өи");
});

test("_ between two letters splits a digraph and is dropped", () => {
  assert.equal(transliterate("unt_san"), "унтсан");
  assert.equal(transliterate("mart_san"), "мартсан");
  assert.equal(transliterate("Bat_saihan"), "Батсайхан");
  assert.equal(transliterate("y_ogurt"), "йогурт");
  assert.equal(transliterate("UNT_SAN"), "УНТСАН");
  // Not between two letters: left alone
  assert.equal(transliterate("a _ b"), "а _ б");
  assert.equal(transliterate("___"), "___");
  assert.equal(transliterate("_a"), "_а");
  assert.equal(transliterate("a_"), "а_");
  // Literal sections keep it
  assert.equal(transliterate("*snake_case*"), "snake_case");
});

test("typographic apostrophes (phone smart punctuation) work like '", () => {
  assert.equal(transliterate("gov’"), "говь");
  assert.equal(transliterate("gov‘"), "говь");
  assert.equal(transliterate("ob’’yekt"), "объект");
  assert.equal(transliterate("ob'’yekt"), "объект");
});

test("casing", () => {
  assert.equal(transliterate("SAIN BAINA UU"), "САЙН БАЙНА УУ");
  assert.equal(transliterate("Sain"), "Сайн");
  assert.equal(transliterate("sain"), "сайн");
  assert.equal(transliterate("Tsagaan"), "Цагаан");
  assert.equal(transliterate("TSAGAAN"), "ЦАГААН");
  assert.equal(transliterate("Shine"), "Шинэ");
  assert.equal(transliterate("SHINE"), "ШИНЭ");
  assert.equal(transliterate("Yu"), "Ю");
  // Soft/hard sign follow the word's case
  assert.equal(transliterate("GOV'"), "ГОВЬ");
  assert.equal(transliterate("Gov'"), "Говь");
  assert.equal(transliterate("OB''YEKT"), "ОБЪЕКТ");
  assert.equal(transliterate("GOV’ HONI"), "ГОВЬ ХОНИ");
  // A single capital is title case, not all-caps
  assert.equal(transliterate("A"), "А");
  assert.equal(transliterate("I"), "И");
});

test("non-letters pass through untouched", () => {
  assert.equal(transliterate("1990 on, 5-r sar!"), "1990 он, 5-р сар!");
  assert.equal(transliterate("sain\nbaina\r\nuu\tta"), "сайн\nбайна\r\nуу\tта");
  assert.equal(transliterate("Сайн uu"), "Сайн уу");
  assert.equal(transliterate("a@b.mn"), "а@б.мн");
  assert.equal(transliterate(""), "");
});

test("non-ASCII letters never shift the index", () => {
  // "İ".toLowerCase() is two code units; must not desync position tracking.
  assert.equal(transliterate("İsain"), "İсайн");
  assert.equal(transliterate("ßain"), "ßайн");
});

test("*...* escape", () => {
  assert.deepEqual(transliterateSegments("bi *React* surch baina"), [
    { text: "би ", literal: false },
    { text: "React", literal: true },
    { text: " сурч байна", literal: false },
  ]);
  // Unmatched star is a normal character
  assert.equal(transliterate("5*3 = 15"), "5*3 = 15");
  assert.equal(transliterate("sain *baina"), "сайн *байна");
  // Empty ** is dropped
  assert.equal(transliterate("sain ** uu"), "сайн  уу");
  // Two escapes in one line
  assert.equal(transliterate("*A* ba *B*"), "A ба B");
});
