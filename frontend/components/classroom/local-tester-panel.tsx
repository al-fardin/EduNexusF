"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FlaskConical, LoaderCircle, XCircle } from "lucide-react";
import { examError } from "@/services/exams";
import { runQuestionTester, type TesterAttachment, type TestResult } from "@/services/question-testers";
import type { Workspace } from "@/services/workspace-phase6";

export function LocalTesterPanel({ classroomId, examId, questionId, tester, workspace, language }: {
  classroomId: string; examId: string; questionId: string; tester: TesterAttachment; workspace: Workspace; language: string;
}) {
  const [state, setState] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = ["preparing", "awaiting_approval", "running"].includes(state);
  async function run() {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setState("preparing"); setResult(null); setError("");
    try {
      setResult(await runQuestionTester(classroomId, examId, questionId, structuredClone(workspace), language, request.signal, setState));
      setState("completed");
    } catch (err) {
      if (request.signal.aborted) { setState(""); return; }
      setError(examError(err)); setState("error");
    } finally { controller.current = null; }
  }
  return <section className="border-t border-[#CBD8C9] bg-[#F7F9F5] px-4 py-3" aria-label="Question case tester">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical size={16} /> Case tester</p><p className="mt-1 truncate text-xs text-[#58695C]" title={tester.name}>{tester.name} · Windows desktop</p></div>
      <div className="flex gap-2">{busy && <button type="button" onClick={() => controller.current?.abort()} className="rounded-lg border border-[#CBD4C9] px-3 py-2 text-xs font-semibold">Cancel</button>}
        <button type="button" disabled={busy || !workspace.entry} onClick={() => void run()} className="inline-flex items-center gap-2 rounded-lg bg-[#24634B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B4C39] disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <FlaskConical size={15} />}{busy ? "Testing…" : "Run Tests"}</button></div>
    </div>
    {busy && <p role="status" className="mt-3 text-xs text-[#415D46]">{state === "awaiting_approval" ? "Approve the tester in EduNexus Desktop to continue." : state === "running" ? "Running tests on your PC…" : "Preparing tester…"}</p>}
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    {result && <div className="mt-3 rounded-lg border border-[#D5DFD2] bg-white p-3">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold">{result.passed === result.total ? <CheckCircle2 size={17} className="text-green-700" /> : <XCircle size={17} className="text-amber-700" />}{result.passed} / {result.total} tests passed<span className="ml-auto text-xs font-normal text-[#58695C]">{result.duration_ms} ms</span></p>
      <p className="mt-1 text-xs text-[#58695C]">Result for the code tested. Local feedback; final marks are assigned separately.</p>
      {result.cases.length > 0 && <ul className="mt-3 max-h-48 space-y-2 overflow-auto">{result.cases.map((test, i) => <li key={i} className="border-t border-[#E4EAE1] pt-2 text-xs"><span className="font-semibold">{test.name}</span><span className={`ml-2 ${test.status === "passed" ? "text-green-700" : "text-red-700"}`}>{test.status}</span>{test.message && <p className="mt-1 whitespace-pre-wrap break-words text-[#58695C]">{test.message}</p>}</li>)}</ul>}
    </div>}
  </section>;
}
