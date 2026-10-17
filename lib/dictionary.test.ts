import { test } from "node:test";
import assert from "node:assert/strict";
import { EXCEPTIONS, MULTI_RULES, transliterate } from "./transliterate.ts";
import { findCollisions, toLatinNaive } from "./collisions.ts";
import { learnFromInput, mergeDictionary, USER_DICTIONARY_MAX } from "./user-dictionary.ts";
import { MN_WORDS } from "./wpm-words.ts";

test("every built-in exception is needed and works", () => {
  for (const [latin, cyr] of Object.entries(EXCEPTIONS)) {
    assert.equal(latin, latin.toLowerCase(), `${latin}: keys are lowercase`);
    assert.equal(cyr, cyr.toLowerCase(), `${latin}: values are lowercase`);
    // Needed: the rules alone get it wrong
    assert.notEqual(transliterate(latin, { builtInExceptions: false }), cyr, `${latin}: redundant entry`);
    // And the entry fixes it
    assert.equal(transliterate(latin), cyr, `${latin}: dictionary not applied`);
    // Prefix keys must end where no multi-letter rule can start, otherwise
    // the key splits a digraph in longer words (batswwri + in → ии, not ий).
    const last = latin[latin.length - 1];
    const starters = new Set(MULTI_RULES.map(([rom]) => rom[0]));
    assert.ok(!starters.has(last), `${latin}: ends in "${last}", which starts a multi-letter rule`);
  }
});

test("exception stems keep the suffix intact", () => {
  assert.equal(transliterate("batswwriin"), "батсүүрийн");
  assert.equal(transliterate("Batswwr"), "Батсүүр");
  assert.equal(transliterate("untsanii"), "унтсаний");
  assert.equal(transliterate("eshwlees"), "эсхүлээс");
});

test("exceptions win over the digraph rules", () => {
  assert.equal(transliterate("untsan"), "унтсан");
  assert.equal(transliterate("Bi untsan"), "Би унтсан");
  assert.equal(transliterate("batswh"), "батсүх");
  assert.equal(transliterate("Batswh"), "Батсүх");
  assert.equal(transliterate("BATSWH"), "БАТСҮХ");
  // Prefix: suffixes still convert
  assert.equal(transliterate("Batswhiin"), "Батсүхийн");
  assert.equal(transliterate("untsanaa"), "унтсанаа");
  // An explicit _ means the user decided; the dictionary stays out
  assert.equal(transliterate("unt_san"), "унтсан");
  assert.equal(transliterate("u_ntsan"), "унцан");
  // Literal sections are untouched
  assert.equal(transliterate("*untsan*"), "untsan");
});

test("a caller dictionary wins over the built-in one, whole words only", () => {
  assert.equal(transliterate("untsan", { dictionary: { untsan: "унцан" } }), "унцан");
  assert.equal(transliterate("Otson", { dictionary: { otson: "отсон" } }), "Отсон");
  // Unrelated words are unaffected
  assert.equal(transliterate("sain", { dictionary: { untsan: "унцан" } }), "сайн");
  // Not a prefix: the suffix form falls back to the rules (or the built-in prefix)
  assert.equal(transliterate("otsonoo", { dictionary: { otson: "отсон" } }), "оцоноо");
  assert.equal(transliterate("untsanaa", { dictionary: { untsan: "унцан" } }), "унтсанаа");
});

test("a learned digraph can never hijack other words", () => {
  // What a user could teach by typing s_h, t_s, a_i, i_i as words.
  const harmful = { sh: "сх", ts: "тс", ai: "аи", ii: "ии", shi: "схи" };
  const opts = { dictionary: harmful };
  assert.equal(transliterate("shine", opts), "шинэ");
  assert.equal(transliterate("tsagaan", opts), "цагаан");
  assert.equal(transliterate("aimag", opts), "аймаг");
  assert.equal(transliterate("iim", opts), "ийм");
  assert.equal(transliterate("Shine Sain", opts), "Шинэ Сайн");
  // The taught word itself, standing alone, is honored
  assert.equal(transliterate("sh", opts), "сх");
});

test("the typing corpus has no collisions once exceptions apply", () => {
  assert.deepEqual(findCollisions(MN_WORDS), []);
});

test("findCollisions reports what the rules get wrong", () => {
  const empty = {};
  const hits = findCollisions(["Цогтсайхан", "сайн", "мартсан"], empty);
  // EXCEPTIONS is always merged in, so these are covered...
  assert.deepEqual(hits, []);
  // ...but a name outside the dictionary is reported with what was typed and produced.
  const [hit] = findCollisions(["Отсон"]);
  assert.deepEqual(hit, { word: "отсон", latin: "otson", got: "оцон" });
  assert.equal(toLatinNaive("Баярлалаа"), "bayarlalaa");
});

test("learnFromInput remembers a_b words without the underscore", () => {
  assert.deepEqual(learnFromInput("bi ot_son, bat_sambuu"), {
    otson: "отсон",
    batsambuu: "батсамбуу",
  });
  // Case of the typed word does not matter
  assert.deepEqual(learnFromInput("Bat_sambuu"), { batsambuu: "батсамбуу" });
  // Already right without the underscore (built-in exception): nothing to store
  assert.deepEqual(learnFromInput("unt_san"), {});
  // Nothing to learn: no underscore, or underscore not between letters
  assert.deepEqual(learnFromInput("sain baina uu"), {});
  assert.deepEqual(learnFromInput("a _ b ___"), {});
  // Inside *...* is not converted, so not learned
  assert.deepEqual(learnFromInput("*snake_case*"), {});
  // A word whose _ changes nothing is not stored
  assert.deepEqual(learnFromInput("b_a"), {});
  // Too short to be a word (and exactly the harmful class): not stored
  assert.deepEqual(learnFromInput("s_h t_s a_i"), {});
  // Over-long keys are not stored
  assert.deepEqual(learnFromInput(`${"a".repeat(45)}_b`), {});
});

test("toLatinNaive spells й the way a user types it", () => {
  assert.equal(toLatinNaive("сайхан"), "saihan");
  assert.equal(toLatinNaive("миний"), "minii");
  assert.equal(toLatinNaive("үгүй"), "wgwi");
  assert.equal(toLatinNaive("йогурт"), "yogurt");
  assert.equal(toLatinNaive("монголын"), "mongolyin");
});

test("mergeDictionary keeps the newest entries within the cap", () => {
  const merged = mergeDictionary({ a: "1", b: "2" }, { b: "3", c: "4" });
  assert.deepEqual(merged, { a: "1", b: "3", c: "4" });
  assert.deepEqual(Object.keys(merged), ["a", "b", "c"]);

  const big: Record<string, string> = {};
  for (let i = 0; i < USER_DICTIONARY_MAX; i++) big[`w${i}`] = "x";
  const capped = mergeDictionary(big, { newest: "y" });
  assert.equal(Object.keys(capped).length, USER_DICTIONARY_MAX);
  assert.equal(capped.newest, "y");
  assert.equal("w0" in capped, false);
});
