"use client";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { academic } from "@/services/academic-tools";
import { clientId } from "@/lib/client-id";
import { usePreferences } from "@/providers/preferences-provider";
import {
  academicReportPDF,
  downloadReportBlob,
  reportText,
  type AcademicReportSnapshot,
} from "@/lib/academic-report-pdf";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
type Report = {
  id: string;
  student_name: string;
  status: string;
  version: number;
  created_at: string;
};
export function AcademicReports({
  classId,
  teacher,
  open,
  onOpenChange,
}: {
  classId: string;
  teacher: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = usePreferences(),
    client = useQueryClient(),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["academic-reports", classId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ data: { items: Report[]; next_offset: number } }>(
          `/classrooms/${classId}/reports`,
          { params: { offset: pageParam } },
        )
      ).data.data,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: open,
  });
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Academic reports")}</DialogTitle>
            <DialogDescription>
              {t("Published grades and attendance in a saved report snapshot.")}
            </DialogDescription>
          </DialogHeader>
          {teacher && (
            <Button onClick={() => setCreate(true)}>
              {t("Prepare report")}
            </Button>
          )}
          {query.isPending ? (
            <ContentSkeleton rows={2} />
          ) : query.isError ? (
            <ErrorState message={examError(query.error)} />
          ) : !query.data?.pages.some((p) => p.items.length) ? (
            <EmptyState title={t("No reports yet")} />
          ) : (
            query.data.pages
              .flatMap((p) => p.items)
              .map((r) => (
                <button
                  key={r.id}
                  className="w-full space-y-2 rounded-xl border border-border p-4 text-left"
                  onClick={() => setSelected(r.id)}
                >
                  <p className="font-semibold">{r.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(r.status)} ·{" "}
                    {new Date(r.created_at).toLocaleString(locale)}
                  </p>
                </button>
              ))
          )}
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {t("More reports")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Prepare report")}</DialogTitle>
            <DialogDescription>
              {t(
                "Preview before publishing. Unpublished exam marks are excluded.",
              )}
            </DialogDescription>
          </DialogHeader>
          {create && (
            <CreateReport
              classId={classId}
              saved={(id) => {
                setCreate(false);
                setSelected(id);
                void client.invalidateQueries({
                  queryKey: ["academic-reports"],
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected("");
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Report preview")}</DialogTitle>
            <DialogDescription>{t("Academic report")}</DialogDescription>
          </DialogHeader>
          {selected && (
            <ReportPreview classId={classId} id={selected} teacher={teacher} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function CreateReport({
  classId,
  saved,
}: {
  classId: string;
  saved: (id: string) => void;
}) {
  const { t } = usePreferences(),
    [request, setRequest] = useState(clientId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const roster = useQuery({
    queryKey: ["report-roster", classId],
    queryFn: () => academic.progress(classId),
  });
  return roster.isPending ? (
    <ContentSkeleton rows={2} />
  ) : roster.isError ? (
    <ErrorState message={examError(roster.error)} />
  ) : (
    <form
      className="space-y-3"
      onChange={() => setRequest(clientId())}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        void api
          .post(`/classrooms/${classId}/reports`, {
            student_id: data.get("student"),
            note: data.get("note"),
            request_id: request,
          })
          .then((res) => saved(res.data.data.id))
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <label className="grid gap-1 text-sm">
        {t("Student")}
        <select
          name="student"
          aria-label={t("Student")}
          required
          disabled={busy}
          className="min-h-11 rounded-xl border border-border bg-card p-3"
        >
          <option value="">{t("Choose a student")}</option>
          {roster.data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.roll}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Teacher note")}
        <textarea
          name="note"
          rows={4}
          maxLength={2000}
          disabled={busy}
          className="rounded-xl border border-border bg-card p-3"
        />
      </label>
      {error && <ErrorState message={error} />}
      <Button type="submit" disabled={busy || !roster.data.students.length}>
        {t("Create preview")}
      </Button>
    </form>
  );
}
function ReportPreview({
  classId,
  id,
  teacher,
}: {
  classId: string;
  id: string;
  teacher: boolean;
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [decision, setDecision] = useState("");
  const query = useQuery({
    queryKey: ["academic-report", classId, id],
    queryFn: async () =>
      (
        await api.get<{
          data: {
            status: string;
            version: number;
            snapshot: AcademicReportSnapshot;
          };
        }>(`/classrooms/${classId}/reports/${id}`)
      ).data.data,
  });
  if (query.isPending) return <ContentSkeleton rows={4} />;
  if (query.isError) return <ErrorState message={examError(query.error)} />;
  const report = query.data,
    s = report.snapshot;
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-border p-4">
        <p className="text-xs text-muted-foreground">
          {t(report.status)} · {s.class_name}
        </p>
        <h2 className="text-xl font-semibold">
          {s.student.name} · {s.student.roll}
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            [
              "Average score",
              s.student.percent === null
                ? "—"
                : s.student.percent.toFixed(1) + "%",
            ],
            ["Graded", s.student.graded],
            ["Missing", s.student.missing],
            [
              "Attendance",
              `${s.student.present}/${s.student.attendance_total}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">
                {t(String(label))}
              </dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-2">
        {s.student.trend.map((r) => (
          <article
            key={r.id}
            className="flex flex-wrap justify-between gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <span>{r.title}</span>
            <strong>
              {r.score}/{r.maximum}
            </strong>
          </article>
        ))}
      </div>
      {s.note && (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm">
          {s.note}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {s.teacher_name} · {new Date(s.generated_at).toLocaleString()}
      </p>
      {error && <ErrorState message={error} />}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            void academicReportPDF(id, s)
              .then((blob) =>
                downloadReportBlob(blob, `EduNexus-report-${id}.pdf`),
              )
              .catch((e) => setError(examError(e)))
              .finally(() => setBusy(false));
          }}
        >
          {t("Download PDF")}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadReportBlob(
              new Blob([reportText(id, s)], {
                type: "text/plain;charset=utf-8",
              }),
              `EduNexus-report-${id}.txt`,
            )
          }
        >
          {t("Download text")}
        </Button>
        {teacher && report.status !== "withdrawn" && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              setDecision(report.status === "draft" ? "published" : "withdrawn")
            }
          >
            {t(
              report.status === "draft" ? "Publish report" : "Withdraw report",
            )}
          </Button>
        )}
      </div>
      <ReasonDialog
        open={!!decision}
        onOpenChange={(v) => {
          if (!v) setDecision("");
        }}
        title={t(
          decision === "published" ? "Publish report" : "Withdraw report",
        )}
        description={t("Record the reason for this report decision.")}
        onConfirm={async (reason) => {
          await api.post(`/classrooms/${classId}/reports/${id}/status`, {
            status: decision,
            version: report.version,
            reason,
          });
          await Promise.all([
            client.invalidateQueries({ queryKey: ["academic-reports"] }),
            client.invalidateQueries({
              queryKey: ["academic-report", classId, id],
            }),
          ]);
        }}
      />
    </div>
  );
}
