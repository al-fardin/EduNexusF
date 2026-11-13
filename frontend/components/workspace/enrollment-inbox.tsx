"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enrollment, type EnrollmentItem } from "@/services/enrollment";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import {
  ConfirmAction,
  EmptyState,
  ErrorState,
} from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function useEnrollmentInbox() {
  const user = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["enrollment-summary", user],
    queryFn: () => enrollment.inbox(),
    enabled: !!user,
    refetchInterval: 30000,
  });
}
export function EnrollmentNotice() {
  const query = useEnrollmentInbox(),
    { t } = usePreferences();
  return query.data?.pending_invitations ? (
    <Link
      href="/invitations"
      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium"
    >
      <span>{t("Class invitations")}</span>
      <span>
        {query.data.pending_invitations} {t("pending")}
      </span>
    </Link>
  ) : null;
}
export function EnrollmentInbox() {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    search = useSearchParams(),
    client = useQueryClient(),
    [accept, setAccept] = useState<EnrollmentItem | null>(null),
    [decline, setDecline] = useState<EnrollmentItem | null>(null),
    [cancel, setCancel] = useState<EnrollmentItem | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const focus = search.get("invite") ?? "";
  const query = useInfiniteQuery({
    queryKey: ["enrollment-inbox", user, focus],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => enrollment.inbox(pageParam, focus),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    refetchInterval: 30000,
  });
  function changed() {
    void client.invalidateQueries({ queryKey: ["enrollment-inbox"] });
    void client.invalidateQueries({ queryKey: ["enrollment-summary"] });
    void client.invalidateQueries({ queryKey: ["workspace"] });
    void client.invalidateQueries({ queryKey: ["classrooms"] });
  }
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setDecline(null);
      setCancel(null);
      changed();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">
            {t("Invitations & join requests")}
          </h1>
          <Link href="/student/classrooms/join" className="en-outline-button">
            {t("Join with code")}
          </Link>
        </header>
        {query.data && !query.data.pages[0].email_verified && (
          <Link
            href="/settings"
            className="block rounded-xl border border-border p-4 text-sm"
          >
            {t("Verify your email to see and accept invitations sent to it.")}
          </Link>
        )}
        {error && <ErrorState message={error} />}{" "}
        {query.isPending ? (
          <ContentSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState
            message={examError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.pages.some((p) => p.items.length) ? (
          <EmptyState title={t("No invitations or join requests")} />
        ) : (
          query.data.pages
            .flatMap((p) => p.items)
            .map((i) => (
              <article
                key={i.kind + i.id}
                className={`space-y-3 rounded-2xl border bg-card p-4 ${i.id === focus ? "border-primary" : "border-border"}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="font-semibold">{i.classroom_name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      i.kind === "invitation"
                        ? "Class invitation"
                        : "Join request",
                    )}{" "}
                    · {t(i.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {i.teacher_name}
                  {i.student_roll ? ` · ${i.student_roll}` : ""}
                </p>
                {i.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("Expires")}:{" "}
                    {new Date(i.expires_at).toLocaleString(locale)}
                  </p>
                )}
                {i.reason && (
                  <p className="whitespace-pre-wrap text-sm">{i.reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {i.kind === "invitation" ? (
                    <>
                      <Button disabled={busy} onClick={() => setAccept(i)}>
                        {t("Accept invitation")}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setDecline(i)}
                      >
                        {t("Decline invitation")}
                      </Button>
                    </>
                  ) : i.status === "pending" ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setCancel(i)}
                    >
                      {t("Withdraw join request")}
                    </Button>
                  ) : i.status === "approved" ? (
                    <Link
                      href={`/student/classrooms/${i.classroom_id}`}
                      className="en-outline-button"
                    >
                      {t("Open classroom")}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
        )}
        {query.hasNextPage && (
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("More invitations and requests")}
          </Button>
        )}
        <Dialog
          open={!!accept}
          onOpenChange={(v) => {
            if (!v) setAccept(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Accept invitation")}</DialogTitle>
              <DialogDescription>{accept?.classroom_name}</DialogDescription>
            </DialogHeader>
            {accept && (
              <AcceptInvitation
                key={accept.id + ":" + accept.version}
                item={accept}
                saved={() => {
                  setAccept(null);
                  changed();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        <ConfirmAction
          open={!!decline}
          onOpenChange={(v) => {
            if (!busy && !v) setDecline(null);
          }}
          title={t("Decline invitation?")}
          description={decline?.classroom_name ?? ""}
          busy={busy}
          onConfirm={() => {
            if (decline)
              void act(() => enrollment.respond(decline, "declined"));
          }}
        />
        <ConfirmAction
          open={!!cancel}
          onOpenChange={(v) => {
            if (!busy && !v) setCancel(null);
          }}
          title={t("Withdraw join request?")}
          description={cancel?.classroom_name ?? ""}
          busy={busy}
          onConfirm={() => {
            if (cancel) void act(() => enrollment.cancel(cancel));
          }}
        />
      </div>
    </main>
  );
}
function AcceptInvitation({
  item,
  saved,
}: {
  item: EnrollmentItem;
  saved: () => void;
}) {
  const { t } = usePreferences(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const roll = String(new FormData(e.currentTarget).get("roll"))
          .trim()
          .toUpperCase();
        setBusy(true);
        setError("");
        void enrollment
          .respond(item, "accepted", roll)
          .then((result) => {
            saved();
            router.push(`/student/classrooms/${result.classroom_id}`);
          })
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <label className="grid gap-1 text-sm">
        {t("Student ID / Roll")}
        <input
          name="roll"
          required
          autoComplete="off"
          minLength={1}
          maxLength={32}
          pattern={"[A-Za-z0-9][A-Za-z0-9_\\x2f\\x2d]{0,31}"}
          disabled={busy}
          className="min-h-11 rounded-xl border border-border bg-background p-3"
        />
      </label>
      {error && <ErrorState message={error} />}
      <Button type="submit" disabled={busy}>
        {t("Accept & join classroom")}
      </Button>
    </form>
  );
}
