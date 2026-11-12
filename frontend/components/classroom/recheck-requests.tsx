"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { academicReviews, type Recheck } from "@/services/academic-reviews";
import { classPath } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
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
export function RecheckRequests({
  classId,
  canManage,
  open,
  onOpenChange,
}: {
  classId: string;
  canManage: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [state, setState] = useState("active"),
    [creating, setCreating] = useState(false),
    [responding, setResponding] = useState<Recheck | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["rechecks", user, classId, state],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      academicReviews.rechecks(classId, state, pageParam),
    getNextPageParam: (p) => (p.next_offset >= 0 ? p.next_offset : undefined),
    enabled: open,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  function changed() {
    void client.invalidateQueries({ queryKey: ["rechecks"] });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("Recheck requests")}</DialogTitle>
          <DialogDescription>
            {t(
              "Review requests keep their own history. Marks change only through the existing grading tools.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-between gap-3">
          <select
            aria-label={t("Review status")}
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-xl border border-border bg-card p-3 text-sm"
          >
            <option value="active">{t("Active requests")}</option>
            <option value="closed">{t("Closed requests")}</option>
            <option value="all">{t("All requests")}</option>
          </select>
          {!canManage && (
            <Button onClick={() => setCreating(true)}>
              {t("Request a recheck")}
            </Button>
          )}
        </div>
        {query.isPending ? (
          <ContentSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState message={examError(query.error)} />
        ) : !items.length ? (
          <EmptyState title={t("No recheck requests")} />
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="space-y-3 rounded-2xl border border-border p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {t(item.status)}
                </span>
              </div>
              <p className="text-sm">
                {item.student_name} · {item.grade.score}/{item.grade.maximum}
              </p>
              <p className="whitespace-pre-wrap text-sm">{item.reason}</p>
              <Link
                className="text-sm text-primary underline"
                href={`${classPath(classId, canManage ? "teacher" : "student")}?tab=${item.kind === "assignment" ? `classwork&work=assignments&assignment=${item.grade.assignment_id}` : "results"}`}
              >
                {t("Open coursework")}
              </Link>
              <details className="rounded-xl bg-secondary p-3 text-sm">
                <summary>{t("Request history")}</summary>
                <ol className="mt-3 space-y-3">
                  {item.events.map((event) => (
                    <li key={event.id}>
                      <p className="font-medium">
                        {event.actor} · {t(event.status)}
                      </p>
                      <time className="text-xs text-muted-foreground">
                        {new Date(event.at).toLocaleString(locale)}
                      </time>
                      <p className="mt-1 whitespace-pre-wrap">{event.reason}</p>
                    </li>
                  ))}
                </ol>
              </details>
              {["open", "reviewing"].includes(item.status) && (
                <Button variant="outline" onClick={() => setResponding(item)}>
                  {t(canManage ? "Respond to request" : "Withdraw request")}
                </Button>
              )}
            </article>
          ))
        )}
        {query.hasNextPage && (
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("More requests")}
          </Button>
        )}
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Request a recheck")}</DialogTitle>
              <DialogDescription>
                {t(
                  "Choose your latest graded assignment or a published exam result.",
                )}
              </DialogDescription>
            </DialogHeader>
            {creating && (
              <CreateRecheck
                classId={classId}
                onSaved={() => {
                  setCreating(false);
                  setState("active");
                  changed();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!responding}
          onOpenChange={(v) => {
            if (!v) setResponding(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t(canManage ? "Respond to request" : "Withdraw request")}
              </DialogTitle>
              <DialogDescription>{responding?.title}</DialogDescription>
            </DialogHeader>
            {responding && (
              <RespondRecheck
                key={responding.id}
                classId={classId}
                item={responding}
                teacher={canManage}
                onSaved={() => {
                  setResponding(null);
                  changed();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
function CreateRecheck({
  classId,
  onSaved,
}: {
  classId: string;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const query = useQuery({
    queryKey: ["recheck-eligible", classId],
    queryFn: () => academicReviews.eligible(classId),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return query.isPending ? (
    <ContentSkeleton rows={2} />
  ) : query.isError ? (
    <ErrorState message={examError(query.error)} />
  ) : !query.data.length ? (
    <EmptyState title={t("No eligible graded results")} />
  ) : (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const [kind, resource] = String(data.get("result")).split(":");
        setBusy(true);
        setError("");
        void academicReviews
          .request(classId, {
            kind,
            resource_id: resource,
            reason: String(data.get("reason")),
          })
          .then(onSaved)
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}
      <label className="grid gap-1 text-sm">
        {t("Graded result")}
        <select
          name="result"
          aria-label={t("Graded result")}
          className="rounded-xl border border-border bg-card p-3"
        >
          {query.data.map((item) => (
            <option value={`${item.kind}:${item.id}`} key={item.kind + item.id}>
              {item.title} · {item.kind}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Reason")}
        <textarea
          name="reason"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          className="rounded-xl border border-border bg-card p-3"
        />
      </label>
      <Button type="submit" disabled={busy}>
        {t("Submit request")}
      </Button>
    </form>
  );
}
function RespondRecheck({
  classId,
  item,
  teacher,
  onSaved,
}: {
  classId: string;
  item: Recheck;
  teacher: boolean;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        void academicReviews
          .respond(classId, item.id, {
            status: teacher ? String(data.get("status")) : "withdrawn",
            version: item.version,
            reason: String(data.get("reason")),
          })
          .then(onSaved)
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}{" "}
      {teacher && (
        <label className="grid gap-1 text-sm">
          {t("Decision")}
          <select
            name="status"
            aria-label={t("Decision")}
            className="rounded-xl border border-border bg-card p-3"
          >
            {["reviewing", "resolved", "rejected"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="grid gap-1 text-sm">
        {t("Reason")}
        <textarea
          name="reason"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="rounded-xl border border-border bg-card p-3"
        />
      </label>
      <Button type="submit" disabled={busy}>
        {t(teacher ? "Save response" : "Withdraw request")}
      </Button>
    </form>
  );
}
