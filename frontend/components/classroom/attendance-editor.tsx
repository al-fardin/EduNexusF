"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { academic, type AttendanceRow } from "@/services/academic-tools";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ErrorState } from "@/components/ui/app-feedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export function AttendanceEditor({ classId }: { classId: string }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false),
    [day, setDay] = useState(today);
  const query = useQuery({
    queryKey: ["attendance-entry", classId, day],
    queryFn: () => academic.attendance(classId, day),
    enabled: open,
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("Record attendance")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Attendance")}</DialogTitle>
            <DialogDescription>{t("Record attendance")}</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            {t("Date")}
            <input
              type="date"
              value={day}
              max={today()}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-xl border border-border bg-card p-3"
            />
          </label>
          {query.isPending ? (
            <ContentSkeleton rows={3} />
          ) : query.isError ? (
            <ErrorState
              message={examError(query.error)}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <AttendanceRows
              key={classId + day + query.dataUpdatedAt}
              classId={classId}
              day={day}
              initial={query.data}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function AttendanceRows({
  classId,
  day,
  initial,
}: {
  classId: string;
  day: string;
  initial: AttendanceRow[];
}) {
  const { t } = usePreferences(),
    client = useQueryClient();
  const [rows, setRows] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void academic
          .saveAttendance(
            classId,
            day,
            rows
              .filter((r) => r.status)
              .map((r) => ({ id: r.id, status: r.status })),
          )
          .then(() => {
            setSaved(true);
            void client.invalidateQueries({ queryKey: ["class-progress"] });
          })
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}
      <div className="max-h-[45dvh] space-y-3 overflow-y-auto">
        {rows.map((row, i) => (
          <label
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
          >
            <span>
              {row.name} · {row.roll}
            </span>
            <select
              aria-label={`${t("Attendance")}: ${row.name}`}
              value={row.status}
              onChange={(e) => {
                setSaved(false);
                setRows(
                  rows.map((r, n) =>
                    i === n ? { ...r, status: e.target.value } : r,
                  ),
                );
              }}
              className="rounded-xl border border-border bg-card p-2"
            >
              <option value="">{t("Not recorded")}</option>
              {["present", "absent", "excused"].map((s) => (
                <option key={s} value={s}>
                  {t(s[0].toUpperCase() + s.slice(1))}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button type="submit" disabled={busy || !rows.some((r) => r.status)}>
        {t("Save attendance")}
      </Button>
      {saved && <p role="status">{t("Attendance saved")}</p>}
    </form>
  );
}
