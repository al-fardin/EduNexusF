"use client";

import { useRef, useState } from "react";
import { FileCheck2, LoaderCircle, Upload, X } from "lucide-react";
import { examError } from "@/services/exams";
import { uploadQuestionTester, type TesterAttachment } from "@/services/question-testers";

export function QuestionTesterUpload({ classroomId, tester, onChange, onBusyChange, disabled = false }: {
  classroomId: string; tester?: TesterAttachment; onChange: (tester?: TesterAttachment) => void;
  onBusyChange: (delta: number) => void; disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function select(file?: File) {
    if (!file || busy) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".exe") || file.size > 10 * 1024 * 1024) {
      setError("Choose a Windows .exe file, up to 10 MB."); return;
    }
    setBusy(true); onBusyChange(1);
    try { onChange(await uploadQuestionTester(classroomId, file)); }
    catch (err) { setError(examError(err)); }
    finally { setBusy(false); onBusyChange(-1); if (input.current) input.current.value = ""; }
  }
  return <div className="mt-3 rounded-xl border border-[#CBD4C9] bg-[#FBFAF6] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-[#243B2C]">Case tester <span className="ml-1 text-xs font-normal text-[#58695C]">Optional · Windows</span></p>
        <p className="mt-1 text-xs text-[#58695C]">Attach an EduNexus-compatible .exe to enable Run Tests.</p></div>
      <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#CBD4C9] px-3 py-2 text-sm font-semibold text-[#243B2C] hover:bg-[#E9EEE5] disabled:opacity-50">
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? "Uploading…" : tester ? "Replace tester" : "Attach .exe"}
      </button>
      <input ref={input} type="file" accept=".exe" aria-label="Upload optional question tester" className="hidden" disabled={disabled || busy} onChange={e => void select(e.target.files?.[0])} />
    </div>
    {tester && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#EDF2EB] px-3 py-2 text-xs text-[#243B2C]"><FileCheck2 size={16} /><span className="min-w-0 flex-1 truncate" title={tester.name}>{tester.name} · {(tester.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" aria-label="Remove tester" disabled={disabled || busy} onClick={() => onChange(undefined)} className="rounded p-2 hover:bg-[#DCE6D9]"><X size={15} /></button></div>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
