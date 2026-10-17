import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLoose, buildLooseIndex, looseKey, looseMatch } from "./loose.ts";
import { transliterateSegments } from "./transliterate.ts";
import { MN_WORDS } from "./wpm-words.ts";

const index = buildLooseIndex(MN_WORDS);

test("looseKey folds the letters loose typing confuses", () => {
  assert.equal(looseKey("өнөөдөр"), "оноодор");
  assert.equal(looseKey("үгүй"), "угуй");
  assert.equal(looseKey("Монголын"), "монголйн");
  assert.equal(looseKey("ерөнхий"), "эронхий");
});

test("looseMatch finds the one list word a loose spelling folds to", () => {
  assert.equal(looseMatch("оноодор", index), "өнөөдөр");
  assert.equal(looseMatch("угуй", index), "үгүй");
  assert.equal(looseMatch("Оноодор", index), "өнөөдөр");
  // Already a list word: left alone
  assert.equal(looseMatch("өнөөдөр", index), null);
  assert.equal(looseMatch("сайн", index), null);
  // Unknown word: left alone
  assert.equal(looseMatch("хахаха", index), null);
});

test("short words are never replaced, even when a list word folds to them", () => {
  // уг, эс, хун, бух, зов are real words that are simply not in the list.
  for (const w of ["уг", "эс", "хун", "бух", "зов"]) {
    assert.equal(looseMatch(w, index), null, w);
  }
  const text = transliterateSegments("ug n' hun buh zov");
  assert.equal(applyLoose(text, index), text);
});

test("ambiguous folds are not replaced", () => {
  const small = buildLooseIndex(["хол", "хөл"]);
  assert.equal(looseMatch("хол", small), null); // list word itself
  // "хол" and "хөл" both fold to "хол"; a typed "хол" is a list word, so it
  // stays. If neither were in the list the spelling would be ambiguous:
  const neither = buildLooseIndex(["хөлс", "холс"]);
  assert.equal(looseMatch("хол", neither), null);
});

test("applyLoose rewrites words inside converted segments only", () => {
  const segments = transliterateSegments("bi onoodor *onoodor* ugui gelee");
  const out = applyLoose(segments, index);
  assert.deepEqual(out, [
    { text: "би ", literal: false },
    { text: "өнөөдөр", literal: false, loose: true },
    { text: " ", literal: false },
    { text: "onoodor", literal: true },
    { text: " ", literal: false },
    { text: "үгүй", literal: false, loose: true },
    { text: " гэлээ", literal: false },
  ]);
  // Case follows the typed word
  const caps = applyLoose(transliterateSegments("ONOODOR Ugui"), index);
  assert.deepEqual(caps.map((s) => s.text), ["ӨНӨӨДӨР", " ", "Үгүй"]);
  // Nothing to change: the very same array comes back
  const same = transliterateSegments("sain baina uu");
  assert.equal(applyLoose(same, index), same);
});
