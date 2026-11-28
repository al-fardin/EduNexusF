"use client";

import { LoadingIcon } from "@/components/ui/loading-indicator";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  workflowTools,
  type PersonalTiming,
  type TimingResource,
} from "@/services/workflow-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function PersonalTiming({ classId }: { classId: string }) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id);
  const [editing, setEditing] = useState<PersonalTiming | null>(null),
    [formKey, setFormKey] = useState(0);
  const query = useInfiniteQuery({
    queryKey: ["personal-timing", user, classId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => workflowTools.timing(classId, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  return (
    <section className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Optional personal timing. Configure exam extra time before the exam starts. The exam closing time and access rules still apply.",
        )}
      </p>
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <TimingForm
            key={formKey}
            classId={classId}
            resources={query.data.pages[0].resources}
            editing={editing}
            onDone={() => {
              setEditing(null);
              setFormKey((k) => k + 1);
            }}
          />
          {query.data.pages
            .flatMap((p) => p.items)
            .map((item) => (
              <article
                key={item.resource_id + item.student_id}
                className="space-y-2 rounded-xl border border-border p-3"
              >
                <p className="break-words font-medium">
                  {item.name} · {item.roll}
                </p>
                <p className="break-words text-sm">
                  {
                    query.data.pages[0].resources.find(
                      (r) => r.id === item.resource_id,
                    )?.title
                  }{" "}
                  ·{" "}
                  {item.kind === "exam"
                    ? `${t("Extra minutes")}: ${item.extra_minutes}`
                    : item.due_at
                      ? new Date(item.due_at).toLocaleString(locale)
                      : t("Class deadline")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(item);
                    setFormKey((k) => k + 1);
                  }}
                >
                  {t("Edit timing")}
                </Button>
              </article>
            ))}
          {editing && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setFormKey((k) => k + 1);
              }}
            >
              {t("Cancel")}
            </Button>
          )}
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {t("More students")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
function TimingForm({
  classId,
  resources,
  editing,
  onDone,
}: {
  classId: string;
  resources: TimingResource[];
  editing: PersonalTiming | null;
  onDone: () => void;
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [id, setID] = useState(editing?.resource_id ?? resources[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const resource = resources.find((r) => r.id === id);
  return (
    <form
      className="space-y-3 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!resource) return;
        const data = new FormData(e.currentTarget);
        const due = String(data.get("due") ?? "");
        setBusy(true);
        setError("");
        void workflowTools
          .saveTiming(classId, {
            resource_id: id,
            kind: resource.kind,
            student_roll: String(data.get("roll")).trim(),
            extra_minutes:
              resource.kind === "exam" ? Number(data.get("extra")) : 0,
            due_at:
              resource.kind === "assignment" && due
                ? new Date(due).toISOString()
                : null,
            version: editing?.version ?? 0,
            reason: String(data.get("reason")),
          })
          .then(async () => {
            await Promise.all(
              [
                "personal-timing",
                "assignments",
                "exams",
                "academic-calendar",
                "task-inbox",
                "workspace",
                "class-progress",
                "gradebook",
                "classroom-activity",
              ].map((k) => client.invalidateQueries({ queryKey: [k] })),
            );
            onDone();
          })
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <label className="grid gap-1 text-sm">
        {t("Coursework")}
        <select
          value={id}
          disabled={busy || !!editing}
          onChange={(e) => setID(e.target.value)}
          className={field}
        >
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {t(r.kind === "exam" ? "Exam" : "Assignment")} · {r.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Full student roll")}
        <input
          name="roll"
          required
          maxLength={32}
          readOnly={!!editing}
          disabled={busy}
          defaultValue={editing?.roll ?? ""}
          className={field}
        />
      </label>
      {resource?.kind === "exam" ? (
        <label className="grid gap-1 text-sm">
          {t("Extra minutes")}
          <input
            name="extra"
            type="number"
            min={0}
            max={239}
            step={1}
            required
            disabled={busy}
            defaultValue={editing?.extra_minutes ?? 0}
            className={field}
          />
        </label>
      ) : (
        <label className="grid gap-1 text-sm">
          {t("Personal deadline")}
          <input
            key={id}
            name="due"
            type="datetime-local"
            disabled={busy}
            defaultValue={
              editing?.due_at
                ? new Date(
                    new Date(editing.due_at).getTime() -
                      new Date(editing.due_at).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            className={field}
          />
          <span className="text-xs text-muted-foreground">
            {t(
              "Blank restores the class deadline. Extensions are limited to 30 days.",
            )}
          </span>
        </label>
      )}
      <label className="grid gap-1 text-sm">
        {t("Reason")}
        <input
          name="reason"
          minLength={3}
          maxLength={1000}
          required
          disabled={busy}
          className={field}
        />
      </label>
      {error && <ErrorState message={error} />}
      <Button type="submit" disabled={!resource || busy}>
        {(busy) && <LoadingIcon size={16}/>} {t(busy ? "Saving…" : "Save timing")}
      </Button>
    </form>
  );
}
