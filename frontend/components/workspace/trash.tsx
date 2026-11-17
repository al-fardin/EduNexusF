"use client";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { workflowTools, type TrashItem } from "@/services/workflow-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  ConfirmAction,
  EmptyState,
  ErrorState,
} from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function TrashContents({ classId = "" }: { classId?: string }) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [item, setItem] = useState<TrashItem | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["trash", user, classId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => workflowTools.trash(classId, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  async function restore() {
    if (!item) return;
    setBusy(true);
    setError("");
    try {
      await workflowTools.restore(item, reason, classId);
      setItem(null);
      setReason("");
      setStatus(
        t(
          item.kind === "class"
            ? "Class restored to archive. Unarchive it when ready."
            : "Content restored",
        ),
      );
      await Promise.all(
        [
          "trash",
          "workspace",
          "classrooms",
          "materials",
          "classwork",
          "classroom-activity",
          "storage",
          "global-search",
        ].map((k) => client.invalidateQueries({ queryKey: [k] })),
      );
    } catch (e) {
      setError(examError(e));
      setItem(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          classId
            ? "Restore announcements and materials deleted within 30 days. Previous audience settings are preserved."
            : "Restore your deleted classes within 30 days. Restored classes stay archived until you unarchive them.",
        )}
      </p>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
      {error && <ErrorState message={error} />}
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.pages.some((p) => p.items.length) ? (
        <EmptyState title={t("Trash is empty")} />
      ) : (
        query.data.pages
          .flatMap((p) => p.items)
          .map((r) => (
            <article
              key={r.kind + r.id}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <h3 className="break-words font-medium">{r.title}</h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  r.kind === "class"
                    ? "Class"
                    : r.kind === "material"
                      ? "Material"
                      : "Announcement",
                )}{" "}
                · {new Date(r.deleted_at).toLocaleString(locale)}
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setItem(r);
                  setReason("");
                  setStatus("");
                }}
              >
                {t("Restore")}
              </Button>
            </article>
          ))
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("More items")}
        </Button>
      )}
      {item && (
        <form
          className="space-y-2 rounded-xl border border-border p-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <p className="break-words text-sm font-medium">
            {t("Restore")}: {item.title}
          </p>
          <label className="grid gap-1 text-sm">
            {t("Reason")}
            <input
              required
              minLength={3}
              maxLength={1000}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setItem(null)}
            >
              {t("Cancel")}
            </Button>
            <RestoreButton
              disabled={busy || reason.trim().length < 3}
              title={item.title}
              onConfirm={() => void restore()}
            />
          </div>
        </form>
      )}
    </section>
  );
}
function RestoreButton({
  disabled,
  title,
  onConfirm,
}: {
  disabled: boolean;
  title: string;
  onConfirm: () => void;
}) {
  const { t } = usePreferences(),
    [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        {t("Confirm restore")}
      </Button>
      <ConfirmAction
        open={open}
        onOpenChange={setOpen}
        title={t("Confirm restore")}
        description={title}
        busy={disabled}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}
export function WorkspaceTrash() {
  const { t } = usePreferences();
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <h1 className="text-2xl font-semibold">{t("Trash")}</h1>
        <TrashContents />
      </div>
    </main>
  );
}
