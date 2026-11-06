const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function harness({
  saved = { examId: "exam", phase: "active" },
  result,
  error,
} = {}) {
  let owner = "student-a";
  let requests = 0;
  const changes = [];
  const valid = {
    attempt: {
      status: "in_progress",
      expires_at: new Date(Date.now() + 60000).toISOString(),
    },
    exam: { ends_at: new Date(Date.now() + 120000).toISOString() },
  };
  const dependencies = {
    "@/services/exams": {
      examService: {
        attempt: async () => {
          requests++;
          if (error) throw error;
          return typeof result === "function"
            ? await result()
            : (result ?? valid);
        },
      },
    },
    "@/store/auth-store": {
      useAuthStore: { getState: () => ({ user: { id: owner } }) },
    },
    "./exam-resume": {
      readActiveExam: () => saved,
      clearActiveExam: (...args) => changes.push(["clear", ...args]),
      rememberActiveExam: (...args) => changes.push(["remember", ...args]),
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("lib/restore-exam-selection.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    { exports, require: (name) => dependencies[name], Date, Error },
  );
  return {
    restore: exports.restoreExamSelection,
    changes,
    requests: () => requests,
    switchAccount: () => {
      owner = "student-b";
    },
  };
}
test("missing navigation and consent entry do not create or fetch an attempt", async () => {
  let h = harness({ saved: null });
  assert.equal((await h.restore("class")).taking, null);
  assert.equal(h.requests(), 0);
  h = harness({ saved: { examId: "exam", phase: "entry" } });
  assert.equal((await h.restore("class")).entryExam, "exam");
  assert.equal(h.requests(), 0);
});
test("an active unexpired attempt restores the answer editor", async () => {
  const h = harness();
  assert.equal((await h.restore("class")).taking, "exam");
  assert.deepEqual(h.changes, []);
});
test("completed and expired attempts clear only their own saved navigation", async () => {
  for (const status of ["submitted", "in_progress"]) {
    const h = harness({
      result: {
        attempt: {
          status,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        },
        exam: { ends_at: new Date(Date.now() + 60000).toISOString() },
      },
    });
    assert.equal((await h.restore("class")).taking, null);
    assert.deepEqual(h.changes, [["clear", "class", "exam"]]);
  }
});
test("a lost start response returns to consent without automatically starting an exam", async () => {
  const h = harness({ error: { response: { status: 404 } } });
  assert.equal((await h.restore("class")).entryExam, "exam");
  assert.deepEqual(h.changes, [["remember", "class", "exam", "entry"]]);
});
test("temporary server failures retain local navigation and drafts", async () => {
  const error = new Error("offline");
  const h = harness({ error });
  await assert.rejects(h.restore("class"), error);
  assert.deepEqual(h.changes, []);
});
test("canceled restore cannot clear a newly mounted session", async () => {
  const abort = new AbortController();
  const h = harness({
    result: async () => {
      abort.abort();
      return { attempt: { status: "submitted" }, exam: {} };
    },
  });
  await assert.rejects(h.restore("class", abort.signal));
  assert.deepEqual(h.changes, []);
});
test("switching accounts during a restore cannot modify the new account navigation", async () => {
  let h;
  h = harness({
    result: async () => {
      h.switchAccount();
      return { attempt: { status: "submitted" }, exam: {} };
    },
  });
  await assert.rejects(h.restore("class"), /account changed/);
  assert.deepEqual(h.changes, []);
});
