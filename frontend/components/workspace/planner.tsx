"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { academic } from "@/services/academic-tools";
import { resourceLink } from "@/lib/academic-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function StudentPlanner() {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    [range] = useState(() => {
      const now = Date.now();
      return {
        from: new Date(now).toISOString(),
        to: new Date(now + 30 * 86400000).toISOString(),
      };
    }),
    [classId, setClass] = useState(""),
    [days, setDays] = useState(7);
  const query = useQuery({
    queryKey: ["academic-calendar", user, "planner", range.from, range.to],
    queryFn: () => academic.calendar(range.from, range.to, true),
    enabled: !!user,
    refetchInterval: 60000,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const end = now + days * 86400000;
  const items = (query.data?.items ?? []).filter(
    (e) =>
      new Date(e.ends_at).getTime() >= now &&
      new Date(e.at).getTime() < end &&
      (!classId || e.classroom_id === classId),
  );
  const classes = Array.from(
    new Map(
      (query.data?.items ?? []).map((e) => [e.classroom_id, e.classroom_name]),
    ).entries(),
  );
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("Student planner")}</h1>
          <nav className="flex gap-2">
            <Link href="/tasks" className="en-outline-button">
              {t("Task inbox")}
            </Link>
            <Link href="/calendar" className="en-outline-button">
              {t("Calendar")}
            </Link>
          </nav>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm">
            {t("Class")}
            <select
              value={classId}
              onChange={(e) => setClass(e.target.value)}
              className="min-h-11 min-w-0 rounded-xl border border-border bg-card p-3"
            >
              <option value="">{t("All classes")}</option>
              {classes.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("Planning window")}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="min-h-11 rounded-xl border border-border bg-card p-3"
            >
              <option value={7}>{t("Next 7 days")}</option>
              <option value={30}>{t("Next 30 days")}</option>
            </select>
          </label>
        </div>
        {query.isPending ? (
          <ContentSkeleton rows={4} />
        ) : query.isError ? (
          <ErrorState
            message={examError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {query.data.truncated && (
              <p role="status" className="text-sm">
                {t("Results are limited; narrow your date range.")}
              </p>
            )}
            {!items.length ? (
              <EmptyState title={t("No upcoming events")} />
            ) : (
              items.map((e) => (
                <Link
                  key={e.kind + e.id}
                  href={
                    e.kind === "event"
                      ? `/calendar#calendar-event-${e.id}`
                      : resourceLink(e)
                  }
                  className="block min-w-0 space-y-2 rounded-2xl border border-border bg-card p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {e.classroom_name} ·{" "}
                      {t(
                        e.kind === "exam"
                          ? "Exam"
                          : e.kind === "assignment"
                            ? "Assignment"
                            : "Event",
                      )}
                    </span>
                    <time dateTime={e.at}>
                      {new Date(e.at).toLocaleString(locale)}
                    </time>
                  </div>
                  <h2 className="break-words font-semibold">{e.title}</h2>
                  {e.kind === "exam" && (
                    <p className="text-sm text-muted-foreground">
                      {t("Closes")}:{" "}
                      {new Date(e.ends_at).toLocaleString(locale)}
                    </p>
                  )}
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </main>
  );
}
