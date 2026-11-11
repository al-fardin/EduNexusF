"use client";
import { useState } from "react";
import { useAssignmentDraft } from "./use-assignment-draft";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
import type { Assignment } from "@/services/assignments";
export function AssignmentDraftForm({ classroomId, assignment: a, baseVersion }: {
    classroomId: string;
    assignment: Pick<Assignment, "id" | "title">;
    baseVersion?: number;
}) {
    const draft = useAssignmentDraft(classroomId, a, baseVersion, true);
    const [busy, setBusy] = useState(false);
    async function submit() { setBusy(true); try {
        await draft.persist(true);
    }
    catch (error) {
        draft.setError(examError(error));
    }
    finally {
        setBusy(false);
    } }
    return <div className="space-y-3">
  <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-3 rounded-xl bg-secondary p-4">
   <label className="block text-sm font-semibold">Your answer<textarea aria-label="Your answer" rows={4} maxLength={20000} value={draft.answer} className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm" disabled={busy || draft.loading || draft.locked || draft.conflicted} onChange={e => draft.editAnswer(e.target.value)}/></label>
   <label className="block text-sm">Attach file · up to 15 MB<input type="file" className="mt-1 w-full rounded-xl border border-border bg-card p-2 text-sm" disabled={busy || draft.loading || draft.locked || draft.conflicted} onChange={e => draft.editFile(e.target.files?.[0] ?? null)} accept=".pdf,.txt,.md,.zip,.docx,.png,.jpg,.jpeg,.py,.cpp,.c,.h,.java,.js,.ts,.go,.rs"/></label>
   {draft.file && <p className="break-all text-xs text-muted-foreground">Saved attachment: {draft.file.name}</p>}
   {draft.record?.value.state === "syncing" && <div role="status" className="en-chat-upload"><progress aria-label="Submission upload" value={draft.progress} max={100}/><span>{draft.progress < 100 ? `Uploading ${draft.progress}%` : "Confirming…"}</span></div>}
   {draft.record?.value.error && <ErrorState message={draft.record.value.error}/>}
   <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || draft.loading || draft.locked || draft.conflicted || draft.expectedVersion < 0 || (!draft.answer.trim() && !draft.file)}>{busy ? "Saving…" : draft.locked ? "Submission queued" : "Submit assignment"}</Button>
   {!draft.locked && !draft.conflicted && <Button type="button" variant="outline" disabled={busy || draft.loading} onClick={() => { setBusy(true); void draft.persist(false).catch(e => draft.setError(examError(e))).finally(() => setBusy(false)); }}>Save draft</Button>}
   {draft.conflicted && <Button type="button" variant="outline" onClick={() => void draft.reload().catch(e => draft.setError(examError(e)))}>Reload saved draft</Button>}
   {draft.record?.value.state === "blocked" && !draft.conflicted && baseVersion !== undefined && <Button type="button" variant="outline" disabled={busy} onClick={() => { setBusy(true); void draft.persist(false, baseVersion).catch(e => draft.setError(examError(e))).finally(() => setBusy(false)); }}>Use current submission version</Button>}</div>
   <p className="text-xs text-muted-foreground">Drafts stay on this device. Queued submissions sync when online; deadlines and submission rules still apply.</p>
  </form>
  {draft.error && <ErrorState message={draft.error}/>}{draft.notice && <p role="status" className="text-sm text-muted-foreground">{draft.notice}</p>}
 </div>;
}
