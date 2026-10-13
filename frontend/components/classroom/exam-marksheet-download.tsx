"use client";
import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { examManagement } from "@/services/exam-management";
import { examError } from "@/services/exams";
export function ExamMarksheetDownload({ classroomId, examId }: { classroomId: string; examId: string }) {
  const [busy,setBusy] = useState(false);
  return <button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await examManagement.downloadPDF(classroomId,examId)}catch(e){alert(examError(e))}finally{setBusy(false)}}} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-card disabled:opacity-50">
    {busy?<LoaderCircle size={16} className="animate-spin"/>:<Download size={16}/>} Download published marksheet PDF
  </button>;
}
