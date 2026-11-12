"use client";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePreferences } from "@/providers/preferences-provider";
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
  body: string;
  file_name: string;
  reason: string;
  reporter: string;
  status: string;
  decision: string;
  version: number;
  conflict: boolean;
  history: Array<{ status: string; reason: string; at: string }>;
};
export function ModerationPanel({
  classId,
  open,
  onOpenChange,
}: {
  classId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = usePreferences(),
    client = useQueryClient(),
    [state, setState] = useState("open"),
    [decision, setDecision] = useState<{
      report: Report;
      status: string;
    } | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["message-reports", classId, state],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ data: { items: Report[]; next_offset: number } }>(
          `/classrooms/${classId}/message-reports`,
          { params: { state, offset: pageParam } },
        )
      ).data.data,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: open,
  });
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Message reports")}</DialogTitle>
            <DialogDescription>
              {t("Review reported messages and record a reasoned decision.")}
            </DialogDescription>
          </DialogHeader>
          <select
            aria-label={t("Report status")}
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card p-3 text-sm"
          >
            <option value="open">{t("Open")}</option>
            <option value="closed">{t("Closed")}</option>
          </select>
          {query.isPending ? (
            <ContentSkeleton rows={2} />
          ) : query.isError ? (
            <ErrorState message={examError(query.error)} />
          ) : !query.data?.pages.some((p) => p.items.length) ? (
            <EmptyState title={t("No message reports")} />
          ) : (
            query.data.pages
              .flatMap((p) => p.items)
              .map((r) => (
                <article
                  key={r.id}
                  className="space-y-3 rounded-xl border border-border p-4"
                >
                  <p className="text-xs text-muted-foreground">
                    {r.reporter} · {t(r.status)}
                  </p>
                  <blockquote className="whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm">
                    {r.body || r.file_name}
                  </blockquote>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {r.reason}
                  </p>
                  <details>
                    <summary className="text-sm font-medium">
                      {t("Review history")}
                    </summary>
                    {r.history.map((h, i) => (
                      <div key={i} className="mt-3 space-y-1 text-sm">
                        <p>
                          {t(h.status)} ·{" "}
                          {new Date(h.at).toLocaleString(locale)}
                        </p>
                        <p className="whitespace-pre-wrap">{h.reason}</p>
                      </div>
                    ))}
                  </details>
                  {r.status === "open" &&
                    (r.conflict ? (
                      <p className="text-xs text-muted-foreground">
                        {t("Another moderator must review this report.")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setDecision({ report: r, status: "resolved" })
                          }
                        >
                          {t("Resolve")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setDecision({ report: r, status: "dismissed" })
                          }
                        >
                          {t("Dismiss report")}
                        </Button>
                      </div>
                    ))}
                </article>
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
      <ReasonDialog
        open={!!decision}
        onOpenChange={(v) => {
          if (!v) setDecision(null);
        }}
        title={t("Record report decision")}
        description={t(
          "This decision does not change marks or automatically punish an account.",
        )}
        onConfirm={async (reason) => {
          if (!decision) return;
          await api.post(
            `/classrooms/${classId}/message-reports/${decision.report.id}/respond`,
            {
              version: decision.report.version,
              status: decision.status,
              reason,
            },
          );
          void client.invalidateQueries({ queryKey: ["message-reports"] });
        }}
      />
    </>
  );
}
