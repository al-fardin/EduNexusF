const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
function context() {
  const storage = () => {
    const m = new Map();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, v),
      removeItem: (k) => m.delete(k),
    };
  };
  const exports = {};
  const window = { localStorage: storage(), sessionStorage: storage() };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("lib/exam-drafts.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, window, Date },
  );
  return { api: exports, window };
}
test("draft survives reopening but is isolated by account", () => {
  const { api } = context();
  const draft = {
    answers: { q: "answer" },
    serverRevision: 3,
    at: Date.now(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  assert.equal(api.saveExamDraft("a", "attempt", draft), true);
  assert.equal(api.readExamDraft("a", "attempt").answers.q, "answer");
  assert.equal(api.readExamDraft("b", "attempt"), null);
  api.removeExamDraft("a", "attempt");
  assert.equal(api.readExamDraft("a", "attempt"), null);
});
test("malformed and stale drafts are rejected", () => {
  const { api, window } = context();
  window.localStorage.setItem(
    "en-exam-draft-v2:a:x",
    JSON.stringify({ answers: ["bad"], serverRevision: 1, at: Date.now() }),
  );
  assert.equal(api.readExamDraft("a", "x"), null);
  api.saveExamDraft("a", "x", {
    answers: { q: "old" },
    serverRevision: 0,
    at: Date.now() - 49 * 3600000,
  });
  assert.equal(api.readExamDraft("a", "x"), null);
});
test("lost save response comparison ignores JSON key ordering", () => {
  const { api } = context();
  assert.equal(api.sameAnswers({ a: "1", b: "2" }, { b: "2", a: "1" }), true);
  assert.equal(api.sameAnswers({ a: "1" }, { a: "2" }), false);
});

function draft(answer = "saved") {
  return {
    answers: { q: answer },
    serverRevision: 1,
    at: Date.now(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
}
test("blocked local storage still recovers account-scoped session drafts", () => {
  const { api, window } = context();
  Object.defineProperty(window, "localStorage", {
    get() {
      throw Error("denied");
    },
  });
  assert.equal(api.saveExamDraft("a", "x", draft()), false);
  assert.equal(api.readExamDraft("a", "x")?.answers.q, "saved");
  assert.equal(api.readExamDraft("b", "x"), null);
  assert.doesNotThrow(() => api.removeExamDraft("a", "x"));
  assert.equal(api.readExamDraft("a", "x"), null);
});
test("a newer session fallback wins over an older durable draft", () => {
  const { api, window } = context();
  api.saveExamDraft("a", "x", { ...draft("old"), at: Date.now() - 1000 });
  window.localStorage.setItem = () => {
    throw Error("quota");
  };
  api.saveExamDraft("a", "x", draft("new"));
  assert.equal(api.readExamDraft("a", "x")?.answers.q, "new");
});
test("unowned legacy session data cannot become another account's draft", () => {
  const { api, window } = context();
  window.sessionStorage.setItem("en-exam-v15:x", JSON.stringify(draft()));
  assert.equal(api.readExamDraft("other", "x"), null);
  Object.defineProperty(window, "sessionStorage", {
    get() {
      throw Error("denied");
    },
  });
  assert.doesNotThrow(() => api.removeExamDraft("a", "x"));
});
