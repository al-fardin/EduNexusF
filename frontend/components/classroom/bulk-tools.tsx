"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { assignments } from "@/services/assignments";
import { academic, type GradePreview } from "@/services/academic-tools";
import { getGradebook } from "@/services/gradebook";
import { downloadBlob } from "@/lib/academic-tools";
import { clientId } from "@/lib/client-id";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState, ConfirmAction } from "@/components/ui/app-feedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function BulkTools({ classId }: { classId: string }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false),
    [assignment, setAssignment] = useState("");
  const items = useQuery({
    queryKey: ["assignments", classId],
    queryFn: () => assignments.list(classId),
    enabled: open,
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("Bulk tools")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Bulk tools")}</DialogTitle>
            <DialogDescription>{t("Assignment")}</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            {t("Assignment")}
            <select
              aria-label={t("Assignment")}
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
              className="rounded-xl border border-border bg-card p-3"
            >
              <option value="">{t("Assignment")}</option>
              {items.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          {!!items.data?.find((a) => a.id === assignment)?.rubric?.length && (
            <details className="rounded-xl border border-border p-3 text-xs">
              <summary>Rubric criteria</summary>
              <ul className="mt-2 space-y-2">
                {items.data
                  ?.find((a) => a.id === assignment)
                  ?.rubric?.map((criterion) => (
                    <li key={criterion.id} className="break-all">
                      <strong>{criterion.title}</strong> · {criterion.maximum}{" "}
                      points
                      <br />
                      <code>{criterion.id}</code>
                    </li>
                  ))}
              </ul>
            </details>
          )}
          {items.isError && <ErrorState message={examError(items.error)} />}{" "}
          {assignment && (
            <AssignmentBulk
              key={assignment}
              classId={classId}
              assignment={assignment}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function AssignmentBulk({
  classId,
  assignment,
}: {
  classId: string;
  assignment: string;
}) {
  const { t } = usePreferences(),
    client = useQueryClient();
  const [csv, setCSV] = useState(""),
    [preview, setPreview] = useState<GradePreview | null>(null),
    [request, setRequest] = useState(clientId),
    [selected, setSelected] = useState<string[]>([]),
    [confirmReminder, setConfirmReminder] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const submissions = useQuery({
    queryKey: ["submissions", classId, assignment],
    queryFn: () => assignments.submissions(classId, assignment),
  });
  const book = useQuery({
    queryKey: ["gradebook", classId],
    queryFn: () => getGradebook(classId),
  });
  const missing =
    book.data?.students.filter((s) =>
      ["missing", "pending"].includes(
        s.cells[`assignment:${assignment}`]?.status,
      ),
    ) ?? [];
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await task();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  function template() {
    void run(async () =>
      downloadBlob(
        await academic.template(classId, assignment),
        "grade-import-template.csv",
      ),
    );
  }

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <p role="status" className="text-sm">
        {status}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !submissions.data?.length}
          onClick={() =>
            void run(async () =>
              downloadBlob(
                await academic.bundle(classId, assignment),
                "submissions.zip",
              ),
            )
          }
        >
          {t("Download submissions")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !submissions.data?.length}
          onClick={template}
        >
          {t("Download CSV template")}
        </Button>
      </div>
      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">{t("Import grades")}</h3>
        <p className="text-xs text-muted-foreground">
          CSV: submission_id, version, points, feedback, criteria. Rubric
          criteria use a JSON object of criterion IDs and scores. Preview lists
          every changed grade before confirmation. Student name, roll and ID
          identify each row and do not change its recipient.
        </p>
        <label className="grid gap-2 text-sm">
          {t("Grade CSV")}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(null);
              setCSV("");
              setRequest(clientId());
              if (file) {
                if (file.size > 1048576) {
                  setError("CSV is limited to 1 MB");
                  return;
                }
                void file
                  .text()
                  .then(setCSV)
                  .catch((err) => setError(examError(err)));
              }
            }}
          />
        </label>
        <Button
          disabled={busy || !csv}
          onClick={() =>
            void run(async () =>
              setPreview(
                await academic.importGrades(classId, assignment, { csv }),
              ),
            )
          }
        >
          {t("Preview import")}
        </Button>
        {preview && (
          <div className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {preview.rows.map((row) => (
                <div className="text-sm" key={row.submission_id}>
                  <p>
                    <strong>{row.student}</strong> · v{row.version}:{" "}
                    {row.previous ?? "—"} → {row.points}/{preview.maximum}
                  </p>
                  {row.feedback && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {row.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await academic.importGrades(classId, assignment, {
                    csv,
                    confirm: true,
                    request_id: request,
                    revision: preview.revision,
                  });
                  setPreview(null);
                  setCSV("");
                  setStatus(t("Import completed"));
                  await Promise.all([
                    client.invalidateQueries({
                      queryKey: ["gradebook", classId],
                    }),
                    client.invalidateQueries({
                      queryKey: ["submissions", classId],
                    }),
                    client.invalidateQueries({ queryKey: ["class-progress"] }),
                  ]);
                })
              }
            >
              {t("Confirm import")}
            </Button>
          </div>
        )}
      </section>
      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">
          {t("Select students without submissions")}
        </h3>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {missing.map((s) => (
            <label
              className="flex min-h-11 items-center gap-3 text-sm"
              key={s.id}
            >
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                disabled={
                  busy || (!selected.includes(s.id) && selected.length >= 200)
                }
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, s.id]
                      : selected.filter((id) => id !== s.id),
                  )
                }
              />
              {s.name} · {s.roll}
            </label>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={busy || !selected.length}
          onClick={() => setConfirmReminder(true)}
        >
          {t("Send reminder")} ({selected.length})
        </Button>
        <ConfirmAction
          open={confirmReminder}
          onOpenChange={setConfirmReminder}
          title={t("Send reminder")}
          description={`${selected.length} selected students. Repeated reminders are deduplicated per UTC day.`}
          busy={busy}
          onConfirm={() =>
            void run(async () => {
              await academic.remind(classId, assignment, selected);
              setConfirmReminder(false);
              setSelected([]);
              setStatus(t("Reminders queued"));
            })
          }
        />
      </section>
    </div>
  );
}
