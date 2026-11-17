"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { examService, examError } from "@/services/exams";
import { contentSchedules } from "@/services/content-schedules";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
export function ExamPublishSchedule({ classId }: { classId: string }) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["exams", classId, user],
    queryFn: () => examService.list(classId),
    enabled: open,
  });
  return (
    <details
      className="min-w-0 space-y-3 rounded-xl border border-border p-3"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        {t("Schedule a draft exam")}
      </summary>
      {open &&
        (query.isPending ? (
          <ContentSkeleton rows={2} />
        ) : query.isError ? (
          <ErrorState message={examError(query.error)} />
        ) : (
          <form
            className="grid min-w-0 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              setStatus("");
              void contentSchedules
                .scheduleExam(
                  classId,
                  String(data.get("exam")),
                  new Date(String(data.get("time"))).toISOString(),
                )
                .then(async () => {
                  setStatus(t("Exam publication scheduled"));
                  await client.invalidateQueries({
                    queryKey: ["content-schedules"],
                  });
                })
                .catch((e) => setError(examError(e)))
                .finally(() => setBusy(false));
            }}
          >
            <label className="grid min-w-0 gap-1 text-sm">
              {t("Draft exam")}
              <select
                name="exam"
                required
                disabled={busy}
                className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
              >
                {query.data
                  .filter((e) => e.status === "draft")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              {t("Publish time")}
              <input
                name="time"
                type="datetime-local"
                required
                disabled={busy}
                className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || !query.data.some((e) => e.status === "draft")}
            >
              {t("Schedule publication")}
            </Button>
          </form>
        ))}
      {error && <ErrorState message={error} />}
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </details>
  );
}
