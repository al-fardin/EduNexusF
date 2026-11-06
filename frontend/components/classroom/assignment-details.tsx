"use client";
import { useQuery } from "@tanstack/react-query";
import { assignments, type Assignment } from "@/services/assignments";
import { examError } from "@/services/exams";
import { AssignmentDraftForm } from "./assignment-draft-form";
import { AssignmentDeadline } from "./assignment-deadline";
import { SubmissionCard } from "./submission-card";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
export function AssignmentDetails({ classroomId, assignment: a, canManage }: {
    classroomId: string;
    assignment: Assignment;
    canManage: boolean;
}) {
    const history = useQuery({ queryKey: ["assignment-submissions", classroomId, a.id], queryFn: () => assignments.submissions(classroomId, a.id, !canManage), networkMode: canManage ? "online" : "always" });
    const latest = history.data?.[0];
    const canSubmit = !canManage && a.status === "published" && (!latest || a.allow_resubmit) && (!latest || latest.version < 10);
    return <div className="mt-4 space-y-4 border-t border-border pt-4">
  <p className="whitespace-pre-wrap text-sm">{a.instructions || "No additional instructions."}</p>
  {canManage && <AssignmentDeadline classroomId={classroomId} assignment={a}/>}
  {history.isPending && <ContentSkeleton rows={2}/>}
  {history.isError && <ErrorState message={examError(history.error)} onRetry={() => void history.refetch()}/>}
  {canSubmit && <AssignmentDraftForm classroomId={classroomId} assignment={a} baseVersion={history.data ? latest?.version ?? 0 : undefined}/>}
  <h4 className="text-sm font-semibold">{canManage ? "Student submissions" : "Submission history"}</h4>
  {history.data?.length === 0 && <EmptyState title="No submissions yet"/>}
  {history.data?.map(s => <SubmissionCard key={s.id} classroomId={classroomId} assignment={a} submission={s} canManage={canManage}/>)}
 </div>;
}
