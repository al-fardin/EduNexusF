"use client";
import { TeacherDesktopEvidence } from "@/components/classroom/desktop-monitoring";

import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText, ChevronDown, ChevronRight, Code2, FileCode2,
  Folder, FolderOpen, LoaderCircle, Search, ShieldCheck, Users, X,
} from "lucide-react";
import { useState } from "react";
import { ExamActivityReport } from "@/components/classroom/exam-activity-report";
import { TeacherMonitorEvidence } from "@/components/classroom/exam-monitoring";
import { examError, examService, type ExamSubmission } from "@/services/exams";
import { detectFileLanguage, parseWorkspace, type Workspace } from "@/services/workspace-phase6";

// Use the exact same locally hosted Monaco assets as Code Studio; no new CDN.
loader.config({ paths: { vs: "/monaco/vs" } });
const CodeViewer = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center text-sm text-[#667869]">Loading read-only code viewer…</div>,
});

type StudentAttempt = ExamSubmission & { student_roll?: string | null };
type TreeEntry = { path: string; label: string; depth: number; folder: boolean };
const border = "border-[#D1D9CE]";
const muted = "text-[#667869]";

function fileTree(workspace: Workspace, closed: Set<string>, questionId: string): TreeEntry[] {
  const allFolders = new Set<string>(workspace.folders || []);
  for (const f of workspace.files) {
    const parts = f.path.split("/");
    for (let n = 1; n < parts.length; n++) allFolders.add(parts.slice(0, n).join("/"));
  }
  const entries: TreeEntry[] = [];
  function walk(parent: string, depth: number) {
    const folders = [...allFolders].filter(f => parentOf(f) === parent).sort((a, b) => a.localeCompare(b));
    const files = workspace.files.filter(f => parentOf(f.path) === parent).sort((a, b) => a.path.localeCompare(b.path));
    for (const f of folders) {
      entries.push({ path: f, label: f.split("/").at(-1) || f, depth, folder: true });
      if (!closed.has(`${questionId}:${f}`)) walk(f, depth + 1);
    }
    for (const f of files) entries.push({ path: f.path, label: f.path.split("/").at(-1) || f.path, depth, folder: false });
  }
  walk("", 0);
  return entries;
}
function parentOf(path: string) { const i = path.lastIndexOf("/"); return i < 0 ? "" : path.slice(0, i); }
function language(path: string, fallback: string) {
  const known = detectFileLanguage(path);
  return known === "cpp" ? "cpp" : known === "c" ? "c" : known || fallback || "plaintext";
}
function displayDate(date: string | null) { return date ? new Date(date).toLocaleString() : "Not submitted"; }
function answerLabel(value: string | undefined) { return value && value.trim() ? value : "No answer submitted"; }

export function TeacherSubmissionExplorer({ classroomId, examId, onClose }: { classroomId: string; examId: string; onClose: () => void }) {
  const attempts = useQuery({ queryKey: ["submissions", examId], queryFn: () => examService.submissions(classroomId, examId) });
  const exam = useQuery({ queryKey: ["teacher-exam", examId], queryFn: () => examService.teacherExam(classroomId, examId) });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"submitted" | "all">("submitted");
  const [pickedStudent, setPickedStudent] = useState<string | null>(null);
  const [pickedQuestion, setPickedQuestion] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const rows = ((attempts.data || []) as StudentAttempt[]).slice().sort((a, b) => {
    const aRoll = (a.student_roll || "").trim();
    const bRoll = (b.student_roll || "").trim();
    if (aRoll && bRoll) return aRoll.localeCompare(bRoll, undefined, { numeric: true, sensitivity: "base" });
    if (aRoll) return -1;
    if (bRoll) return 1;
    return (a.student_name || a.email).localeCompare(b.student_name || b.email);
  });
  const filtered = rows.filter(row => {
    if (tab === "submitted" && row.status !== "submitted") return false;
    const term = search.trim().toLowerCase();
    return !term || [row.student_roll, row.student_name, row.email].some(v => (v || "").toLowerCase().includes(term));
  });
  const student = filtered.find(row => row.id === pickedStudent) || filtered[0];
  const questions = exam.data?.questions || [];
  const question = questions.find(q => q.id === pickedQuestion) || questions.find(q => q.kind === "coding") || questions[0];
  const response = student && question ? (student.answers?.[question.id] ?? "") : "";
  const workspace = question?.kind === "coding" ? parseWorkspace(response, question.language || "other") : null;
  const entryFile = workspace?.files.find(f => f.path === pickedFile)
    || workspace?.files.find(f => f.path === workspace.entry)
    || workspace?.files[0];
  const files = workspace && question ? fileTree(workspace, collapsed, question.id) : [];

  return <section className={`overflow-hidden rounded-[27px_14px_24px_16px] border ${border} bg-[#FBFAF6] text-[#202C24] shadow-[0_12px_32px_rgba(20,26,21,0.06)]`}>
    <header className={`flex flex-wrap items-center justify-between gap-3 border-b ${border} bg-[#EFF1EA] p-4 sm:p-5`}>
      <div><h3 className="flex items-center gap-2 text-lg font-bold"><Users size={20}/> Student submissions · Roll-wise</h3><p className={`mt-1 text-xs ${muted}`}>Teacher-only exam workspace review. Each student’s folders and files are preserved.</p></div>
      <button type="button" className={`inline-flex items-center gap-1 rounded-lg border ${border} bg-[#FBFAF6] px-3 py-2 text-sm hover:bg-[#E3EADF]`} onClick={onClose}><X size={15}/> Close review</button>
    </header>
    {(attempts.isPending || exam.isPending) && <div role="status" className="space-y-3 p-5"><div className="h-9 animate-pulse rounded bg-[#E1E8DE]"/><div className="h-52 animate-pulse rounded bg-[#E9EEE6]"/></div>}
    {(attempts.isError || exam.isError) && <p role="alert" className="p-4 text-sm text-[#A13C42]">Could not load submissions: {examError(attempts.error || exam.error)}</p>}
    {!attempts.isPending && !exam.isPending && !attempts.isError && !exam.isError && <>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${border} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" className={`rounded-lg px-3 py-2 ${tab === "submitted" ? "bg-[#2B342C] text-white" : "bg-[#E9EEE5]"}`} onClick={() => { setTab("submitted"); setPickedStudent(null); }}>Submitted ({rows.filter(r => r.status === "submitted").length})</button>
          <button type="button" className={`rounded-lg px-3 py-2 ${tab === "all" ? "bg-[#2B342C] text-white" : "bg-[#E9EEE5]"}`} onClick={() => { setTab("all"); setPickedStudent(null); }}>All attempts ({rows.length})</button>
        </div>
        <label className={`flex items-center gap-2 rounded-lg border ${border} bg-white px-3 py-2`}><Search size={15}/><input aria-label="Search by student roll or name" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Roll / Name" className="w-40 bg-transparent text-xs outline-none sm:w-56"/></label>
      </div>
      <div className="grid min-h-[460px] lg:grid-cols-[245px_minmax(0,1fr)]">
        <aside className={`border-b ${border} bg-[#F0F2ED] lg:border-b-0 lg:border-r`}>
          <div className={`border-b ${border} px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${muted}`}>Student Roll · Student Name</div>
          <div className="max-h-[600px] overflow-y-auto p-2">
            {filtered.length === 0 && <p className={`p-3 text-sm ${muted}`}>{rows.length === 0 ? "No students have started this exam." : "No matching submissions yet."}</p>}
            {filtered.map(row => <button type="button" key={row.id} onClick={() => { setPickedStudent(row.id); setPickedQuestion(null); setPickedFile(null); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${student?.id === row.id ? "bg-[#DFE8DC]" : "hover:bg-[#E7ECE4]"}`}>
              <span className="min-w-[46px] rounded-md bg-[#2B342C] px-2 py-1.5 text-center font-mono text-xs font-bold text-white">{row.student_roll || "—"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.student_name || row.email}</span><span className={`block text-[10px] ${muted}`}>{row.status === "submitted" ? "Submitted" : row.status === "expired" ? "Expired" : "In progress"}</span></span>
              <ChevronRight size={15} className="shrink-0 text-[#758576]"/>
            </button>)}
          </div>
        </aside>
        <div className="min-w-0">
          {!student ? <div className={`flex h-full min-h-64 items-center justify-center text-sm ${muted}`}>Select a Student Roll to review submitted files.</div> : <>
            <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${border} p-4`}>
              <div><h4 className="font-bold">Roll {student.student_roll || "Not assigned"} · {student.student_name || student.email}</h4><p className={`mt-1 text-xs ${muted}`}>{student.status} · Submitted: {displayDate(student.submitted_at)}</p></div>
              <span className="rounded-lg bg-[#E6ECE3] px-3 py-2 text-xs">{questions.length} questions</span>
            </div>
            <div className={`flex flex-wrap gap-2 border-b ${border} p-3`}>
              {questions.map((q, i) => <button type="button" key={q.id} onClick={() => { setPickedQuestion(q.id); setPickedFile(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${question?.id === q.id ? "bg-[#2B342C] text-white" : "bg-[#ECF0E9] hover:bg-[#DEE8DA]"}`}>Q{i + 1} · {q.kind}{q.kind === "coding" && student.answers?.[q.id] ? " · files" : ""}</button>)}
            </div>
            {question ? <div className="p-3 sm:p-4">
              <h5 className="mb-3 text-sm font-bold"><BookOpenText size={16} className="mr-1 inline"/> {question.prompt}</h5>
              {question.kind !== "coding" ? <div className={`rounded-xl border ${border} bg-[#F5F6F2] p-4 text-sm`}><div className={`mb-2 text-xs ${muted}`}>{question.kind === "mcq" ? "Selected option" : "Written answer"}</div><pre className="whitespace-pre-wrap break-words font-sans">{question.kind === "mcq" ? ((response.trim() === "" ? "No answer submitted" : (question.options?.[Number(response)] ?? "Invalid option"))) : answerLabel(response)}</pre></div> : <div className={`overflow-hidden rounded-xl border ${border}`}>
                <div className="grid md:grid-cols-[210px_minmax(0,1fr)]">
                  <aside className="border-b border-[#D1D9CE] bg-[#EEF1EB] md:border-b-0 md:border-r md:border-r-[#D1D9CE]">
                    <div className={`border-b ${border} flex items-center gap-2 px-3 py-3 text-[11px] font-bold uppercase tracking-wide`}><FolderOpen size={14}/> Submitted Workspace</div>
                    <div className="max-h-[420px] min-h-[110px] overflow-auto py-2">
                      {files.length === 0 && <p className={`px-3 py-4 text-xs ${muted}`}>Student submitted no files for this question.</p>}
                      {files.map(node => <button type="button" key={`${node.folder ? "folder" : "file"}:${node.path}`} title={node.path} onClick={() => {
                        if (node.folder) setCollapsed(old => { const copy = new Set(old); const k = `${question.id}:${node.path}`; if (copy.has(k)) copy.delete(k); else copy.add(k); return copy; });
                        else setPickedFile(node.path);
                      }} className={`flex w-full items-center gap-1.5 truncate py-1.5 pr-2 text-left text-xs hover:bg-[#DBE5D8] ${!node.folder && entryFile?.path === node.path ? "bg-[#DDE8DA] font-semibold" : ""}`} style={{paddingLeft: `${12 + node.depth * 15}px`}}>
                        {node.folder ? (collapsed.has(`${question.id}:${node.path}`) ? <ChevronRight size={12}/> : <ChevronDown size={12}/>) : <span className="w-3"/>}
                        {node.folder ? (collapsed.has(`${question.id}:${node.path}`) ? <Folder size={14}/> : <FolderOpen size={14}/>) : <FileCode2 size={14}/>}
                        <span className="truncate">{node.label}</span>
                      </button>)}
                    </div>
                    <p className={`border-t ${border} px-3 py-2 text-[10px] ${muted}`}>{workspace?.folders.length ?? 0} folders · {workspace?.files.length ?? 0} files</p>
                  </aside>
                  <div className="min-w-0 bg-[#FBFAF6]">
                    <div className={`flex items-center justify-between gap-2 border-b ${border} bg-[#EFF1EA] px-3 py-2 text-xs`}><span className="flex min-w-0 items-center gap-1.5 truncate font-semibold"><Code2 size={14}/>{entryFile?.path || "Choose a file"}</span><span className={muted}>Read-only</span></div>
                    {entryFile ? <CodeViewer key={`${student.id}:${question.id}:${entryFile.path}`} height="370px" path={`teacher-review/${examId}/${student.id}/${question.id}/${entryFile.path}`} language={language(entryFile.path, question.language || "plaintext")} value={entryFile.content} theme="vs" options={{readOnly:true,domReadOnly:true,minimap:{enabled:false},lineNumbers:"on",fontSize:13,automaticLayout:true,scrollBeyondLastLine:false,wordWrap:"on",padding:{top:12,bottom:12}}}/> : <div className={`flex h-[370px] items-center justify-center text-sm ${muted}`}>Select a file from the Explorer.</div>}
                  </div>
                </div>
              </div>}
            </div> : <p className={`p-4 text-sm ${muted}`}>No questions found.</p>}
            <div className={`border-t ${border} p-4`}><div className="mb-1 flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16}/> Activity evidence (teacher only)</div><p className={`text-xs ${muted}`}>Paste, edits, code runs and tab visibility logs are review signals—not proof of cheating.</p><ExamActivityReport classroomId={classroomId} examId={examId} attemptId={student.id}/><TeacherMonitorEvidence classroomId={classroomId} examId={examId} attemptId={student.id}/><TeacherDesktopEvidence classroomId={classroomId} examId={examId} attemptId={student.id}/></div>
          </>}
        </div>
      </div>
    </>}
  </section>;
}
