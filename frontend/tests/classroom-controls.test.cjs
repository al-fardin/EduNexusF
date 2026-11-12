const test = require("node:test");
const assert = require("node:assert/strict");
const { cardMarkup, reportMarkup } = require("./helpers/classroom-component-render.cjs");

test("classroom actions distinguish owner, co-teacher and student", () => {
  const owner = cardMarkup("owner");
  assert.match(owner, /Delete class/);
  assert.match(owner, /Archive class/);
  const archivedOwner = cardMarkup("owner", "archived");
  assert.match(archivedOwner, /Restore class/);
  for (const actor of ["co-teacher", "student"]) {
    const card = cardMarkup(actor, "active", actor === "student" ? "student" : "teacher");
    assert.doesNotMatch(card, /Delete class|Archive class|Restore class/);
    assert.match(card, /Class details/);
    if (actor === "student") assert.match(card, /Leave class/);
  }
});

test("report student selection has a stable translated label and preserves roster names", () => {
  for (const [language, label] of [["en", "Student"], ["bn", "শিক্ষার্থী"]]) {
    const form = reportMarkup(language);
    assert.match(form, new RegExp(`aria-label="${label}"`));
    assert.match(form, /name="student"/);
    assert.match(form, /value="student-id">রাফি আহমেদ · 001/);
    assert.match(form, /button type="submit"/);
  }
});
