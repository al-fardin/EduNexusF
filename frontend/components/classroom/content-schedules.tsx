"use client";
import { ExamPublishSchedule } from "./exam-publish-schedule";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  contentSchedules,
  type ContentSchedule,
} from "@/services/content-schedules";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  ErrorState,
  EmptyState,
  ConfirmAction,
} from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";

export function ContentSchedules({
  classId,
  open,
  onOpenChange,
}: {
  classId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = usePreferences(),
    client = useQueryClient(),
    user = useAuthStore((s) => s.user?.id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [publish, setPublish] = useState<ContentSchedule | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["content-schedules", user, classId],
    queryFn: ({ pageParam }) => contentSchedules.list(classId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });
  async function update(
    item: ContentSchedule,
    action: "cancel" | "publish" | "reschedule",
    at?: string,
  ) {
    setBusy(true);
    setError("");
    try {
      await contentSchedules.update(classId, item, action, at);
      setPublish(null);
      await Promise.all(
        [
          ["content-schedules"],
          ["assignments", classId],
          ["exams", classId],
          ["materials", classId],
          ["classrooms", "stream", classId],
        ].map((queryKey) => client.invalidateQueries({ queryKey })),
      );
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Scheduled content")}</DialogTitle>
          <DialogDescription>
            {t(
              "Manage scheduled exams, assignments and materials. Posts are in announcement drafts.",
            )}
          </DialogDescription>
        </DialogHeader>
        {open && <ExamPublishSchedule classId={classId} />}
        {error && <ErrorState message={error} />}
        {query.isPending ? (
          <ContentSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState
            message={examError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.pages.some((p) => p.items.length) ? (
          <EmptyState title={t("No scheduled coursework")} />
        ) : (
          query.data.pages
            .flatMap((p) => p.items)
            .map((item) => (
              <article
                key={item.id}
                className="min-w-0 space-y-2 rounded-xl border border-border p-4 [overflow-wrap:anywhere]"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    item.kind === "material"
                      ? "Material"
                      : item.kind === "exam"
                        ? "Exam"
                        : "Assignment",
                  )}{" "}
                  · {t(item.state)} ·{" "}
                  {new Date(item.publish_at).toLocaleString(locale)}
                </p>
                {item.error && (
                  <p className="text-sm text-destructive">{t(item.error)}</p>
                )}
                {item.state !== "published" && (
                  <>
                    <form
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const value = String(
                          new FormData(e.currentTarget).get("time"),
                        );
                        void update(
                          item,
                          "reschedule",
                          new Date(value).toISOString(),
                        );
                      }}
                    >
                      <label className="grid min-w-0 flex-1 gap-1 text-sm">
                        {t("Publish time")}
                        <input
                          key={item.version}
                          name="time"
                          type="datetime-local"
                          required
                          disabled={busy}
                          defaultValue={new Date(
                            new Date(item.publish_at).getTime() -
                              new Date(item.publish_at).getTimezoneOffset() *
                                60000,
                          )
                            .toISOString()
                            .slice(0, 16)}
                          className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3"
                        />
                      </label>
                      <Button type="submit" variant="outline" disabled={busy}>
                        {t("Reschedule")}
                      </Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busy} onClick={() => setPublish(item)}>
                        {t("Publish now")}
                      </Button>
                      {item.state !== "cancelled" && (
                        <Button
                          className="min-h-11 whitespace-normal"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void update(item, "cancel")}
                        >
                          {t("Cancel schedule")}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </article>
            ))
        )}
        {query.hasNextPage && (
          <Button
            className="min-h-11 whitespace-normal"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("More schedules")}
          </Button>
        )}
        <ConfirmAction
          open={!!publish}
          onOpenChange={(value) => {
            if (!busy && !value) setPublish(null);
          }}
          title={t("Publish content now?")}
          description={publish?.title ?? ""}
          busy={busy}
          onConfirm={() => {
            if (publish) void update(publish, "publish");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
