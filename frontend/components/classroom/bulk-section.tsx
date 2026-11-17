"use client";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { sections, type RosterStudent } from "@/services/sections";
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
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function BulkSection({ classId }: { classId: string }) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [q, setQ] = useState(""),
    [selected, setSelected] = useState<Record<string, RosterStudent>>({}),
    [section, setSection] = useState(""),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["section-roster", user, classId, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => sections.roster(classId, q, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  const choices = useQuery({
    queryKey: ["class-sections", user, classId],
    queryFn: () => sections.list(classId),
  });
  const count = Object.keys(selected).length;
  async function save() {
    setBusy(true);
    setError("");
    try {
      await sections.bulk(classId, Object.values(selected), section, reason);
      setSelected({});
      setReason("");
      setConfirm(false);
      setStatus(t("Section transfer saved"));
      await Promise.all(
        [
          "section-roster",
          "class-sections",
          "class-progress",
          "gradebook",
          "audience-preview",
          "classroom-activity",
          "student-view",
        ].map((k) => client.invalidateQueries({ queryKey: [k] })),
      );
    } catch (e) {
      setError(examError(e));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Select up to 200 students. Roll numbers and existing submissions stay unchanged.",
        )}
      </p>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
      {error && <ErrorState message={error} />}
      <label className="grid gap-1 text-sm">
        {t("Search students")}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={100}
          disabled={busy}
          className={field}
        />
      </label>
      {query.isPending || choices.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError || choices.isError ? (
        <ErrorState message={examError(query.error || choices.error)} />
      ) : (
        <>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {query.data.pages
              .flatMap((p) => p.items)
              .map((r) => (
                <label
                  key={r.id}
                  className="flex min-h-11 items-center gap-3 rounded-lg p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    disabled={busy || (!selected[r.id] && count >= 200)}
                    onChange={(e) => {
                      setStatus("");
                      setSelected((old) => {
                        const next = { ...old };
                        if (e.target.checked) next[r.id] = r;
                        else delete next[r.id];
                        return next;
                      });
                    }}
                  />
                  <span className="min-w-0 break-words">
                    {r.name} · {r.roll || t("No roll")}
                  </span>
                </label>
              ))}
            {!query.data.pages[0].items.length && (
              <EmptyState title={t("No students found")} />
            )}
          </div>
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage || busy}
              onClick={() => void query.fetchNextPage()}
            >
              {t("More students")}
            </Button>
          )}
          <p role="status" className="text-sm">
            {t("Selected students")}: {count}
          </p>
          <Button
            variant="ghost"
            disabled={!count || busy}
            onClick={() => setSelected({})}
          >
            {t("Clear selection")}
          </Button>
          <label className="grid gap-1 text-sm">
            {t("Move to section")}
            <select
              value={section}
              disabled={busy}
              onChange={(e) => setSection(e.target.value)}
              className={field}
            >
              <option value="">{t("Unassigned")}</option>
              {choices.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("Reason for roster change")}
            <input
              value={reason}
              disabled={busy}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
              className={field}
            />
          </label>
          <Button
            disabled={!count || reason.trim().length < 3 || busy}
            onClick={() => setConfirm(true)}
          >
            {t("Review section transfer")}
          </Button>
          <ConfirmAction
            open={confirm}
            onOpenChange={setConfirm}
            busy={busy}
            title={t("Confirm section transfer")}
            description={`${t("Selected students")}: ${count} · ${t("Section")}: ${choices.data.find((s) => s.id === section)?.name || t("Unassigned")} · ${reason}`}
            onConfirm={() => void save()}
          />
        </>
      )}
    </section>
  );
}
