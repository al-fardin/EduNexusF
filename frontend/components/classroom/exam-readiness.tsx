"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  inspectDraft,
  focusExamIssue,
  type ReadinessReport,
} from "@/lib/exam-readiness";
import { examService, examError, type NewExam } from "@/services/exams";
import { outline, primary } from "./exam-presentation";

export function ExamReadiness({
  classId,
  draft,
  examId,
  onPublished,
  disabled = false,
}: {
  classId: string;
  draft?: NewExam;
  examId?: string;
  onPublished?: () => void;
  disabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{
      key: string;
      report: ReadinessReport;
      conflicts: {
        title: string;
        classroom_name: string;
        warning: string;
        shared_students: number;
      }[];
      conflictError: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useQueryClient();
  const key = JSON.stringify(draft ?? examId),
    local = draft ? inspectDraft(draft) : null,
    saved = snapshot?.key === key ? snapshot : null;
  async function check() {
    setBusy(true);
    setError("");
    try {
      let form = draft;
      if (!form) {
        const detail = await examService.teacherExam(classId, examId!);
        form = { ...detail.exam, questions: detail.questions };
      }
      const r = draft
        ? await api.post(`/classrooms/${classId}/exams/readiness`, draft)
        : await api.get(`/classrooms/${classId}/exams/${examId}/readiness`);
      let conflicts: NonNullable<typeof snapshot>["conflicts"] = [],
        conflictError = "";
      try {
        const found = await api.post(
          `/classrooms/${classId}/schedule-conflicts`,
          {
            kind: "exam",
            starts_at: form.starts_at,
            ends_at: form.ends_at,
            resource_id: examId ?? "",
            audience: form.audience,
          },
        );
        conflicts = found.data.data.items ?? [];
      } catch {
        conflictError =
          "Schedule conflicts could not be checked. Retry before publishing.";
      }
      setSnapshot({ key, report: r.data.data, conflicts, conflictError });
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  const report = saved?.report ?? local;
  return (
    <details className="my-3 min-w-0 rounded-xl border border-border bg-card p-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        Exam readiness
        {report
          ? ` · ${report.total_points} points · ${report.issues.filter((i) => i.severity === "error").length} issue(s)`
          : ""}
      </summary>
      <div className="space-y-3 pt-2">
        {report?.issues.map((issue, i) => (
          <div key={i} className="text-sm">
            <p
              className={
                issue.severity === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {issue.message}
            </p>
            {draft && (
              <button
                type="button"
                className={`${outline} mt-1`}
                onClick={() => focusExamIssue(issue)}
              >
                Go to field
              </button>
            )}
          </div>
        ))}
        {examId && (
          <Link
            href={`/instructor/classrooms/${classId}?tab=exam&manage_exam=${examId}&edit=1#exam-management`}
            className={outline}
          >
            Open exam editor
          </Link>
        )}
        {report?.ready && <p className="text-sm">Question checks passed.</p>}
        <button
          type="button"
          className={outline}
          disabled={busy || disabled}
          onClick={() => void check()}
        >
          {busy ? "Checking…" : "Check saved data & schedule"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved?.conflictError && (
          <p
            role="status"
            className="text-sm text-amber-700 dark:text-amber-300"
          >
            {saved.conflictError}
          </p>
        )}
        {saved?.conflicts.map((c, i) => (
          <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
            {c.warning}: {c.title} · {c.classroom_name} · {c.shared_students}{" "}
            shared students
          </p>
        ))}
        {saved && !saved.conflictError && !saved.conflicts.length && (
          <p className="text-xs text-muted-foreground">
            No schedule conflicts found in classes you can access.
          </p>
        )}
        {examId && saved?.report.ready && (
          <button
            type="button"
            className={primary}
            disabled={busy || disabled}
            onClick={() => {
              if (
                !window.confirm(
                  "Publish this checked exam for its selected audience?",
                )
              )
                return;
              setBusy(true);
              setError("");
              void examService
                .publish(classId, examId)
                .then(async () => {
                  await client.invalidateQueries({
                    queryKey: ["classrooms", classId, "exams"],
                  });
                  onPublished?.();
                })
                .catch((e) => setError(examError(e)))
                .finally(() => setBusy(false));
            }}
          >
            Publish checked exam
          </button>
        )}
      </div>
    </details>
  );
}
