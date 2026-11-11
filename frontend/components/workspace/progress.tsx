"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspace } from "@/services/workspace";
import { academic, type StudentProgress } from "@/services/academic-tools";
import { needsSupport } from "@/lib/academic-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { AttendanceEditor } from "@/components/classroom/attendance-editor";
import { examError } from "@/services/exams";
export function WorkspaceProgress() {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    params = useSearchParams();
  const classes = useQuery({
    queryKey: ["workspace", user],
    queryFn: () => workspace.overview(),
    enabled: !!user,
  });
  const selected =
    classes.data?.classes.find((c) => c.id === params.get("class")) ??
    classes.data?.classes[0];
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <h1 className="text-2xl font-semibold">{t("Progress")}</h1>
        {classes.isPending ? (
          <ContentSkeleton rows={3} />
        ) : classes.isError ? (
          <ErrorState message={examError(classes.error)} />
        ) : !selected ? (
          <EmptyState title={t("No enrolled classes")} />
        ) : (
          <>
            <nav
              aria-label={t("Choose a class")}
              className="flex flex-wrap gap-2"
            >
              {classes.data.classes.map((c) => (
                <Link
                  className={`rounded-xl border px-3 py-2 text-sm ${c.id === selected.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  key={c.id}
                  href={`/progress?class=${c.id}`}
                  aria-current={c.id === selected.id ? "page" : undefined}
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <ClassProgress
              key={selected.id}
              classId={selected.id}
              teacher={selected.role === "teacher"}
              student={params.get("student") ?? undefined}
            />
          </>
        )}
      </div>
    </main>
  );
}
function ClassProgress({
  classId,
  teacher,
  student,
}: {
  classId: string;
  teacher: boolean;
  student?: string;
}) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState(false),
    [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["class-progress", user, classId, student],
    queryFn: () => academic.progress(classId, student),
  });
  const rows = (query.data?.students ?? []).filter(
    (s) =>
      (!filter || needsSupport(s)) &&
      (s.name + " " + s.roll).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {t(teacher ? "Class progress" : "Student progress")}
        </h2>
        {teacher && <AttendanceEditor classId={classId} />}
      </header>
      {teacher && student && (
        <Link className="en-outline-button" href={`/progress?class=${classId}`}>
          {t("Back to roster")}
        </Link>
      )}
      {teacher && !student && (
        <div className="space-y-2">
          <input
            aria-label={t("Search students")}
            placeholder={t("Search students")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filter}
              onChange={(e) => setFilter(e.target.checked)}
            />
            {t("Needs support")}
          </label>
          <p className="text-xs text-muted-foreground">
            Support indicators: missing work, average below 50%, or recorded
            attendance below 75%. These are prompts for review, not final
            judgements.
          </p>
        </div>
      )}
      {query.isPending ? (
        <ContentSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !rows.length ? (
        <EmptyState title={t("No results")} />
      ) : (
        <div className="space-y-4">
          {rows.map((s) => (
            <article
              key={s.id}
              className="space-y-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  {s.name} · {s.roll}
                </h3>
                {teacher && !student && (
                  <Link
                    href={`/progress?class=${classId}&student=${s.id}`}
                    className="text-sm font-medium text-primary underline"
                  >
                    {t("View progress")}
                  </Link>
                )}
              </div>
              <StudentStats student={s} />
              {(!teacher || student) && (
                <section className="space-y-3">
                  <h4 className="font-semibold">{t("Score history")}</h4>
                  {!s.trend.length ? (
                    <p className="text-sm text-muted-foreground">
                      {t("No graded work yet")}
                    </p>
                  ) : (
                    s.trend.map((item) => (
                      <div key={item.kind + item.id} className="space-y-1">
                        <div className="flex justify-between gap-3 text-sm">
                          <span>{item.title}</span>
                          <span>
                            {item.score}/{item.maximum}
                          </span>
                        </div>
                        <progress
                          className="h-2 w-full accent-primary"
                          value={item.score}
                          max={Math.max(1, item.maximum)}
                          aria-label={item.title}
                        />
                      </div>
                    ))
                  )}
                </section>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function StudentStats({ student: s }: { student: StudentProgress }) {
  const { t } = usePreferences();
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        [
          "Average score",
          s.percent === null ? "—" : `${s.percent.toFixed(1)}%`,
        ],
        ["Missing work", s.missing],
        [
          "Attendance",
          s.attendance_total ? `${s.present}/${s.attendance_total}` : "—",
        ],
        ["Graded work", s.graded],
      ].map(([label, value]) => (
        <div className="rounded-xl bg-secondary p-3" key={label}>
          <dt className="text-xs text-muted-foreground">{t(String(label))}</dt>
          <dd className="mt-1 text-xl font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
