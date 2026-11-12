"use client";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { workspace } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { Button } from "@/components/ui/button";
import { examError } from "@/services/exams";
type Task = {
  id: string;
  kind: string;
  title: string;
  classroom_id: string;
  classroom_name: string;
  at: string;
  state: string;
  url: string;
};
export function TaskInbox() {
  const user = useAuthStore((s) => s.user?.id),
    { t, locale } = usePreferences();
  const [kind, setKind] = useState(""),
    [classId, setClass] = useState("");
  const classes = useQuery({
    queryKey: ["workspace", user],
    queryFn: () => workspace.overview(),
  });
  const tasks = useInfiniteQuery({
    queryKey: ["task-inbox", user, kind, classId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ data: { items: Task[]; next_offset: number } }>(
          "/workspace/tasks",
          { params: { kind, class: classId, offset: pageParam } },
        )
      ).data.data,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    refetchInterval: 60000,
  });
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("Task inbox")}</h1>
          <Button
            variant="outline"
            disabled={tasks.isFetching}
            onClick={() => void tasks.refetch()}
          >
            {t("Refresh")}
          </Button>
        </header>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label={t("Task type")}
            className="min-h-11 rounded-xl border border-border bg-card p-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {[
              ["", "All tasks"],
              ["assignment", "Assignments"],
              ["exam", "Exams"],
              ["recheck", "Recheck requests"],
              ["update", "Unread updates"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {t(l)}
              </option>
            ))}
          </select>
          <select
            aria-label={t("Class")}
            className="min-h-11 min-w-0 max-w-full rounded-xl border border-border bg-card p-3 text-sm"
            value={classId}
            onChange={(e) => setClass(e.target.value)}
          >
            <option value="">{t("All classes")}</option>
            {classes.data?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {tasks.isPending ? (
          <ContentSkeleton rows={4} />
        ) : tasks.isError ? (
          <ErrorState
            message={examError(tasks.error)}
            onRetry={() => void tasks.refetch()}
          />
        ) : !tasks.data?.pages.some((p) => p.items.length) ? (
          <EmptyState title={t("You're up to date")} />
        ) : (
          <div className="space-y-3">
            {tasks.data.pages
              .flatMap((p) => p.items)
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className="block space-y-2 rounded-2xl border border-border bg-card p-4 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.classroom_name} · {t(item.kind)}
                    </span>
                    <span
                      className={
                        item.state === "overdue" ? "text-destructive" : ""
                      }
                    >
                      {t(item.state)}
                    </span>
                  </div>
                  <h2 className="break-words font-semibold">{item.title}</h2>
                  <time className="block text-xs text-muted-foreground">
                    {new Date(item.at).toLocaleString(locale)}
                  </time>
                </Link>
              ))}
          </div>
        )}
        {tasks.hasNextPage && (
          <Button
            variant="outline"
            disabled={tasks.isFetchingNextPage}
            onClick={() => void tasks.fetchNextPage()}
          >
            {t("More tasks")}
          </Button>
        )}
      </div>
    </main>
  );
}
