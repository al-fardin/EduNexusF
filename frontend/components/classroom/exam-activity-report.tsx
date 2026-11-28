"use client";

import { LoadingIcon } from "@/components/ui/loading-indicator";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { codingService } from "@/services/coding";
import { examError } from "@/services/exams";

export function ExamActivityReport({ classroomId, examId, attemptId }: { classroomId: string; examId: string; attemptId: string }) {
  const report = useQuery({
    queryKey: ["exam-activity", examId, attemptId],
    queryFn: () => codingService.report(classroomId, examId, attemptId),
    staleTime: 5000,
  });
  if (report.isPending) return <div role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground"><LoadingIcon size={15}  /> Loading activity evidence…</div>;
  if (report.isError) return <p role="alert" className="mt-3 text-xs text-destructive">Activity report unavailable: {examError(report.error)}</p>;
  const data = report.data;
  if (!data) return <p role="status" className="mt-3 text-xs text-muted-foreground">No activity report is available yet.</p>;
  const safeFlags = Array.isArray(data.flags) ? data.flags : [];
  const safeEvents = Array.isArray(data.events) ? data.events : [];
  const safeSummary = data.summary ?? { pastes: 0, large_pastes: 0, tab_hides: 0, edit_batches: 0, code_runs: 0, failed_runs: 0 };
  return (
    <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h4 className="flex items-center gap-2 font-semibold"><ShieldAlert size={17} className="text-primary" /> Exam activity (teacher only)</h4>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[
          ["Pastes", safeSummary.pastes],
          ["Large pastes", safeSummary.large_pastes],
          ["Tab hides", safeSummary.tab_hides],
          ["Edit batches", safeSummary.edit_batches],
          ["Code runs", safeSummary.code_runs],
          ["Failed runs", safeSummary.failed_runs],
        ].map(([label, value]) => (
          <div className="rounded-xl bg-secondary p-3" key={label}>
            <span className="block text-muted-foreground">{label}</span>
            <b className="text-lg text-foreground">{value}</b>
          </div>
        ))}
      </div>
      {safeFlags.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Review signals (not proof)</strong>
          <ul className="mt-1 list-inside list-disc">{safeFlags.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No preset review thresholds were reached. This does not guarantee a violation-free exam.</p>
      )}
      <p className="text-xs leading-5 text-muted-foreground">{data.notice}</p>
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold">Recent logged events ({safeEvents.length} shown)</summary>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {safeEvents.map((event, idx) => (
            <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2" key={idx}>
              <span>{event.kind.replaceAll("_", " ")}{event.question_id ? ` · Q ${event.question_id.slice(0, 8)}` : ""}{event.magnitude ? ` · ${event.magnitude}` : ""}</span>
              <span className="text-muted-foreground">{new Date(event.recorded_at).toLocaleString()}</span>
            </div>
          ))}
          {!safeEvents.length && <p className="py-2 text-muted-foreground">No client events were recorded.</p>}
        </div>
      </details>
    </section>
  );
}
