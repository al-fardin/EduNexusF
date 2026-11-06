"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedFilePreview } from "@/components/files/protected-preview";
import { assignments, type Assignment, type Submission } from "@/services/assignments";
import { examError } from "@/services/exams";
const btn = "rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const field = "mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm";
const date = (s: string) => new Date(s).toLocaleString();
export function SubmissionCard({ classroomId, assignment: a, submission: s, canManage }: {
    classroomId: string;
    assignment: Assignment;
    submission: Submission;
    canManage: boolean;
}) {
    const client = useQueryClient();
    const [points, setPoints] = useState(s.awarded_points ?? 0);
    const [feedback, setFeedback] = useState(s.feedback);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    return <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">{canManage ? `${s.student_name} · ` : ""}Version {s.version} · {date(s.submitted_at)}{s.late ? " · Late" : ""} · {s.awarded_points === null ? "Awaiting grade" : `${s.awarded_points}/${a.max_points}`}</summary><div className="mt-3 space-y-3"><p className="whitespace-pre-wrap break-words text-sm">{s.answer}</p>{s.file_name && <ProtectedFilePreview path={`/classrooms/${classroomId}/assignments/${a.id}/submissions/${s.id}/file`} filename={s.file_name}/>}
 {s.file_name && <button className={btn} onClick={() => void assignments.download(classroomId, a.id, s).catch(e => setError(examError(e)))}>Download {s.file_name}</button>}
 {canManage ? <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try {
        await assignments.grade(classroomId, a.id, s.id, points, feedback, reason);
        await Promise.all([client.invalidateQueries({ queryKey: ["assignment-submissions", classroomId, a.id] }), client.invalidateQueries({ queryKey: ["classroom-activity", classroomId] })]);
    }
    catch (err) {
        setError(examError(err));
    }
    finally {
        setBusy(false);
    } }}><label className="block text-sm">Points<input type="number" min={0} max={a.max_points} required className={field} value={points} onChange={e => setPoints(Number(e.target.value))}/></label><label className="block text-sm">Feedback<textarea rows={2} maxLength={5000} className={field} value={feedback} onChange={e => setFeedback(e.target.value)}/></label><label className="block text-sm">Reason for grade change<input required={s.awarded_points !== null} minLength={3} maxLength={1000} className={field} value={reason} onChange={e => setReason(e.target.value)}/></label><button disabled={busy} className={btn}>{busy ? "Saving…" : "Save grade & feedback"}</button></form> : s.feedback && <p className="whitespace-pre-wrap text-sm">Teacher feedback: {s.feedback}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></details>;
}
