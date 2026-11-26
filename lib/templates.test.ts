import { test } from "node:test";
import assert from "node:assert/strict";
import { appendTemplate, TEMPLATES } from "./templates.ts";
import { transliterate } from "./transliterate.ts";

test("templates are Cyrillic only, without dashes, and pass through the engine unchanged", () => {
  for (const t of TEMPLATES) {
    assert.doesNotMatch(t.text, /[a-zA-Z]/, t.label);
    assert.doesNotMatch(t.text, /[—–-]/, t.label);
    assert.equal(transliterate(t.text), t.text, t.label);
    assert.ok(t.label.length <= 16, t.label);
  }
  assert.equal(new Set(TEMPLATES.map((t) => t.label)).size, TEMPLATES.length);
});

test("appendTemplate starts a new line unless the input is empty or ends in a break", () => {
  assert.equal(appendTemplate("", "Сайн байна уу?"), "Сайн байна уу?");
  assert.equal(appendTemplate("bi", "Сайн байна уу?"), "bi\nСайн байна уу?");
  assert.equal(appendTemplate("bi\n", "Сайн байна уу?"), "bi\nСайн байна уу?");
  assert.equal(appendTemplate("bi ", "Сайн байна уу?"), "bi Сайн байна уу?");
});
