import { test } from "node:test";
import assert from "node:assert/strict";
import { toLatin } from "./reverse.ts";
import { transliterate } from "./transliterate.ts";
import { MN_WORDS } from "./wpm-words.ts";

test("typemon style spells words the way a user types them", () => {
  assert.equal(toLatin("Сайн байна уу"), "Sain baina uu");
  assert.equal(toLatin("өнөөдөр"), "qnqqdqr");
  assert.equal(toLatin("үгүй"), "wgwi");
  assert.equal(toLatin("миний"), "minii");
  assert.equal(toLatin("говь"), "gov'");
  assert.equal(toLatin("объект"), "ob''yekt");
  assert.equal(toLatin("монголын"), "mongolyin");
  assert.equal(toLatin("Ерөнхий"), "Yerqnhii");
  assert.equal(toLatin("йогурт"), "y_ogurt");
  // й after е/я/ю/ё/ө/ы has no <vowel>i rule, so it stays y
  assert.equal(toLatin("музей"), "muzyey");
  assert.equal(toLatin("Сергей"), "Syergyey");
  assert.equal(toLatin("хөй"), "hqy");
  assert.equal(toLatin("ый"), "yiy");
});

test("typemon style inserts _ where the plain spelling would not round-trip", () => {
  assert.equal(toLatin("унтсан"), "unt_san");
  assert.equal(toLatin("Батсүх"), "Bat_swh");
  assert.equal(toLatin("Цогтсайхан"), "Tsogt_saihan");
  assert.equal(toLatin("эсхүл"), "es_hwl");
  // No _ where the rules already read it right
  assert.equal(toLatin("цэцэрлэг"), "tsetserleg");
});

test("typemon style round-trips the corpus and names", () => {
  const words = [
    ...MN_WORDS,
    "Батсайхан", "Цогтсайхан", "Батсүх", "Батсүүрийн", "Энхтуяа", "Йорк", "Нью-Йорк",
    "музей", "хоккей", "Сергей", "Андрей", "лицей", "хөй", "яй", "ый", "ёй", "юй",
  ];
  const failures = words.filter((w) => transliterate(toLatin(w), { builtInExceptions: false }) !== w);
  assert.deepEqual(failures, []);
});

test("mns style follows MNS 5217:2012", () => {
  assert.equal(toLatin("Сайн байна уу", "mns"), "Sain baina uu");
  assert.equal(toLatin("Өнөөдөр", "mns"), "Önöödör");
  assert.equal(toLatin("Хөх хот", "mns"), "Khökh khot");
  assert.equal(toLatin("говь", "mns"), "govi");
  assert.equal(toLatin("Монголын", "mns"), "Mongolyn");
  assert.equal(toLatin("Ерөнхий", "mns"), "Yerönkhii");
  assert.equal(toLatin("Батсүх", "mns"), "Batsükh");
});

test("casing and non-Cyrillic text", () => {
  assert.equal(toLatin("МОНГОЛ УЛС"), "MONGOL ULS");
  assert.equal(toLatin("Улаанбаатар"), "Ulaanbaatar");
  assert.equal(toLatin("ГОВЬ"), "GOV'");
  assert.equal(toLatin("Ө"), "Q");
  assert.equal(toLatin("1990 он, 5-р сар!"), "1990 on, 5-r sar!");
  assert.equal(toLatin("hello сайн"), "hello sain");
  assert.equal(toLatin(""), "");
});
