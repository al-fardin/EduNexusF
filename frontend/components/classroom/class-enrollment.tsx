"use client";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  enrollment,
  type JoinPolicy,
  type JoinRequest,
  type ClassInvitation,
} from "@/services/enrollment";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { JoinPolicyFields } from "./join-policy-fields";
import { Button } from "@/components/ui/button";
import {
  ConfirmAction,
  EmptyState,
  ErrorState,
} from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function ClassEnrollment({
  classId,
  owner,
  open,
  onOpenChange,
}: {
  classId: string;
  owner: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = usePreferences(),
    [tab, setTab] = useState<"requests" | "invitations" | "settings">(
      "requests",
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Class enrollment")}</DialogTitle>
          <DialogDescription>
            {t("Review join requests and invite students.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ...["requests", "invitations"],
              ...(owner ? ["settings"] : []),
            ] as const
          ).map((value) => (
            <Button
              key={value}
              variant={tab === value ? "default" : "outline"}
              aria-pressed={tab === value}
              onClick={() => setTab(value as typeof tab)}
            >
              {t(
                value === "requests"
                  ? "Join requests"
                  : value === "invitations"
                    ? "Email invitations"
                    : "Join settings",
              )}
            </Button>
          ))}
        </div>
        {open &&
          (tab === "settings" && owner ? (
            <EnrollmentSettings classId={classId} />
          ) : tab === "invitations" ? (
            <TeacherInvitations classId={classId} />
          ) : (
            <TeacherJoinRequests classId={classId} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
function EnrollmentSettings({ classId }: { classId: string }) {
  const user = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["join-settings", user, classId],
    queryFn: () => enrollment.settings(classId),
  });
  return query.isPending ? (
    <ContentSkeleton rows={3} />
  ) : query.isError ? (
    <ErrorState message={examError(query.error)} />
  ) : (
    <JoinSettingsForm
      key={query.data.version}
      classId={classId}
      initial={query.data}
    />
  );
}
function JoinSettingsForm({
  classId,
  initial,
}: {
  classId: string;
  initial: JoinPolicy & { version: number; class_code: string };
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [value, setValue] = useState<JoinPolicy>(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setSaved(false);
        void enrollment
          .saveSettings(classId, { ...value, version: initial.version })
          .then(() => {
            setSaved(true);
            return client.invalidateQueries({ queryKey: ["join-settings"] });
          })
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-sm">
        {t("Class code")}:{" "}
        <code className="font-semibold tracking-widest">
          {initial.class_code}
        </code>
      </p>
      <JoinPolicyFields value={value} onChange={setValue} disabled={busy} />
      {error && <ErrorState message={error} />}
      <Button type="submit" disabled={busy}>
        {t("Save join settings")}
      </Button>
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Join settings saved")}
        </p>
      )}
    </form>
  );
}
function TeacherJoinRequests({ classId }: { classId: string }) {
  const { t, locale } = usePreferences(),
    client = useQueryClient(),
    user = useAuthStore((s) => s.user?.id),
    [state, setState] = useState("pending"),
    [approve, setApprove] = useState<JoinRequest | null>(null),
    [reject, setReject] = useState<JoinRequest | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["join-requests", user, classId, state],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => enrollment.requests(classId, state, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    refetchInterval: 15000,
  });
  function changed() {
    void client.invalidateQueries({ queryKey: ["join-requests"] });
    void client.invalidateQueries({
      queryKey: ["classrooms", "members", classId],
    });
  }
  return (
    <section className="space-y-3">
      <select
        aria-label={t("Join request status")}
        className="min-h-11 rounded-xl border border-border bg-background p-3 text-sm"
        value={state}
        onChange={(e) => setState(e.target.value)}
      >
        <option value="pending">{t("Pending")}</option>
        <option value="closed">{t("Reviewed")}</option>
      </select>
      {error && <ErrorState message={error} />}{" "}
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState message={examError(query.error)} />
      ) : !query.data?.pages.some((p) => p.items.length) ? (
        <EmptyState title={t("No join requests")} />
      ) : (
        query.data.pages
          .flatMap((p) => p.items)
          .map((r) => (
            <article
              key={r.id}
              className="space-y-2 rounded-xl border border-border p-4"
            >
              <h3 className="font-semibold">
                {r.name} · {r.student_roll}
              </h3>
              <p className="break-all text-xs text-muted-foreground">
                {r.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(r.status)} · {new Date(r.updated_at).toLocaleString(locale)}
              </p>
              {r.reason && (
                <p className="whitespace-pre-wrap text-sm">{r.reason}</p>
              )}
              {r.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => setApprove(r)}>
                    {t("Approve join request")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setReject(r)}
                  >
                    {t("Reject join request")}
                  </Button>
                </div>
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
      <ConfirmAction
        open={!!approve}
        onOpenChange={(v) => {
          if (!busy && !v) setApprove(null);
        }}
        title={t("Approve join request?")}
        description={approve ? `${approve.name} · ${approve.student_roll}` : ""}
        busy={busy}
        onConfirm={() => {
          if (!approve) return;
          setBusy(true);
          setError("");
          void enrollment
            .review(classId, approve, "approved")
            .then(() => {
              setApprove(null);
              changed();
            })
            .catch((e) => setError(examError(e)))
            .finally(() => setBusy(false));
        }}
      />
      <ReasonDialog
        open={!!reject}
        onOpenChange={(v) => {
          if (!v) setReject(null);
        }}
        title={t("Reject join request")}
        description={reject?.name ?? ""}
        onConfirm={async (reason) => {
          if (reject)
            await enrollment.review(classId, reject, "rejected", reason);
          changed();
        }}
      />
    </section>
  );
}
function TeacherInvitations({ classId }: { classId: string }) {
  const { t, locale } = usePreferences(),
    client = useQueryClient(),
    user = useAuthStore((s) => s.user?.id),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [revoke, setRevoke] = useState<ClassInvitation | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["class-invitations", user, classId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => enrollment.invitations(classId, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    refetchInterval: 15000,
  });
  function changed() {
    void client.invalidateQueries({ queryKey: ["class-invitations"] });
  }
  async function send(email: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await enrollment.invite(classId, email);
      setMessage(t("Invitation created"));
      changed();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(String(new FormData(e.currentTarget).get("email")));
        }}
      >
        <label className="grid min-w-0 flex-1 gap-1 text-sm">
          {t("Student email")}
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            disabled={busy}
            className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
          />
        </label>
        <Button type="submit" disabled={busy}>
          {t("Send invitation")}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        {t(
          "The student accepts with the same verified email and chooses their roll. Invitations expire in seven days.",
        )}
      </p>
      {query.data && !query.data.pages[0].email_configured && (
        <p role="status" className="text-xs text-muted-foreground">
          {t(
            "In-app invitations are available. Email delivery awaits SMTP and a valid frontend URL.",
          )}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      {error && <ErrorState message={error} />}{" "}
      {query.isPending ? (
        <ContentSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState message={examError(query.error)} />
      ) : !query.data?.pages.some((p) => p.items.length) ? (
        <EmptyState title={t("No student invitations")} />
      ) : (
        query.data.pages
          .flatMap((p) => p.items)
          .map((i) => (
            <article
              key={i.id}
              className="space-y-2 rounded-xl border border-border p-4"
            >
              <h3 className="break-all text-sm font-semibold">{i.email}</h3>
              <p className="text-xs text-muted-foreground">
                {t(i.active_member ? "Already joined" : i.status)} ·{" "}
                {t("Email")}: {t(i.email_status)}
              </p>
              <time className="block text-xs text-muted-foreground">
                {t("Expires")}: {new Date(i.expires_at).toLocaleString(locale)}
              </time>
              {!i.active_member && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={
                      busy ||
                      query.dataUpdatedAt - new Date(i.updated_at).getTime() <
                        600000
                    }
                    onClick={() => void send(i.email)}
                  >
                    {t("Resend invitation")}
                  </Button>
                  {(i.status === "pending" || i.status === "expired") && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRevoke(i)}
                    >
                      {t("Revoke invitation")}
                    </Button>
                  )}
                </div>
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
          {t("More invitations")}
        </Button>
      )}
      <ConfirmAction
        open={!!revoke}
        onOpenChange={(v) => {
          if (!busy && !v) setRevoke(null);
        }}
        title={t("Revoke invitation?")}
        description={revoke?.email ?? ""}
        busy={busy}
        onConfirm={() => {
          if (!revoke) return;
          setBusy(true);
          setError("");
          void enrollment
            .revoke(classId, revoke)
            .then(() => {
              setRevoke(null);
              changed();
            })
            .catch((e) => setError(examError(e)))
            .finally(() => setBusy(false));
        }}
      />
    </section>
  );
}
