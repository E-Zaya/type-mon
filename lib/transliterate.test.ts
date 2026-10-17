import { test } from "node:test";
import assert from "node:assert/strict";
import { transliterate, transliterateSegments } from "./transliterate.ts";
import fixtures from "./transliterate-fixtures.json" with { type: "json" };

// The shared fixtures are the contract every implementation must meet.
const groups = new Map<string, typeof fixtures.cases>();
for (const c of fixtures.cases) {
  const list = groups.get(c.group) ?? [];
  list.push(c);
  groups.set(c.group, list);
}
for (const [group, cases] of groups) {
  test(`fixtures: ${group}`, () => {
    for (const c of cases) {
      assert.equal(transliterate(c.input), c.expected, JSON.stringify(c.input));
    }
  });
}

test("fixtures have unique inputs", () => {
  const inputs = fixtures.cases.map((c) => c.input);
  assert.equal(new Set(inputs).size, inputs.length);
});

test("*...* escape returns segments the UI can highlight", () => {
  assert.deepEqual(transliterateSegments("bi *React* surch baina"), [
    { text: "би ", literal: false },
    { text: "React", literal: true },
    { text: " сурч байна", literal: false },
  ]);
});
