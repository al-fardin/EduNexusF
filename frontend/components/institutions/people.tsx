"use client";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  institutions,
  type InstitutionWorkspace,
  type InstitutionMember,
  type InstitutionRole,
} from "@/services/institutions";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function InstitutionInviteInbox() {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["institution-inbox", user],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => institutions.inbox(pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: !!user,
  });
  if (query.isError)
    return (
      <ErrorState
        message={examError(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data?.pages.some((p) => p.items.length)) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <h2 className="font-semibold">{t("Institution invitations")}</h2>
      {error && <ErrorState message={error} />}
      {query.data.pages
        .flatMap((p) => p.items)
        .map((inv) => (
          <article
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <p className="break-words text-sm">
              {inv.name} · {t(inv.role)}
            </p>
            <div className="flex gap-2">
              {(["accept", "decline"] as const).map((action) => (
                <Button
                  key={action}
                  className="min-h-11"
                  variant={action === "accept" ? "default" : "outline"}
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setError("");
                    void institutions
                      .respond(inv, action)
                      .then(() =>
                        Promise.all(
                          [
                            "institution-inbox",
                            "institutions",
                            "institution-choices",
                          ].map((k) =>
                            client.invalidateQueries({ queryKey: [k] }),
                          ),
                        ),
                      )
                      .catch((e) => setError(examError(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  {t(action === "accept" ? "Accept" : "Decline")}
                </Button>
              ))}
            </div>
          </article>
        ))}
      {query.hasNextPage && (
        <Button
          className="min-h-11"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("More invitations")}
        </Button>
      )}
    </section>
  );
}
export function InstitutionPeople({ org }: { org: InstitutionWorkspace }) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [email, setEmail] = useState(""),
    [role, setRole] = useState<InstitutionRole>("student"),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [change, setChange] = useState<{
      member: InstitutionMember;
      role: InstitutionRole;
      remove: boolean;
    } | null>(null);
  const members = useInfiniteQuery({
    queryKey: ["institution-members", user, org.id, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => institutions.members(org.id, pageParam, q),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  const invites = useInfiniteQuery({
    queryKey: ["institution-invites", user, org.id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => institutions.invitations(org.id, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  async function refresh() {
    await Promise.all(
      [
        "institution-members",
        "institution-invites",
        "institution-classes",
        "institution-history",
        "institutions",
        "class-institution",
      ].map((k) => client.invalidateQueries({ queryKey: [k] })),
    );
  }
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      setEmail("");
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(() => institutions.invite(org.id, email, role));
        }}
      >
        <h3 className="font-semibold">{t("Invite institution member")}</h3>
        <p className="text-xs text-muted-foreground">
          {t(
            "Invitations appear in the recipient's institution inbox. No email is sent automatically.",
          )}
        </p>
        <label className="grid gap-1 text-sm">
          {t("Email")}
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </label>
        <RoleSelect
          value={role}
          onChange={setRole}
          owner={org.role === "owner"}
          disabled={busy}
        />
        <Button type="submit" className="min-h-11" disabled={busy}>
          {t("Send invitation")}
        </Button>
      </form>
      <section className="space-y-3">
        <h3 className="font-semibold">{t("Members")}</h3>
        <label className="grid gap-1 text-sm">
          {t("Search members")}
          <input
            value={q}
            type="search"
            maxLength={200}
            onChange={(e) => setQ(e.target.value)}
            className={field}
          />
        </label>
        {members.isPending ? (
          <ContentSkeleton rows={3} />
        ) : members.isError ? (
          <ErrorState message={examError(members.error)} />
        ) : (
          members.data.pages
            .flatMap((p) => p.items)
            .map((m) => (
              <MemberRow
                key={m.id + ":" + m.version}
                member={m}
                actor={user ?? ""}
                owner={org.role === "owner"}
                busy={busy}
                onChange={(role, remove) =>
                  setChange({ member: m, role, remove })
                }
              />
            ))
        )}
        {members.hasNextPage && (
          <Button
            className="min-h-11"
            variant="outline"
            disabled={members.isFetchingNextPage}
            onClick={() => void members.fetchNextPage()}
          >
            {t("More members")}
          </Button>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">{t("Invitations")}</h3>
        {invites.isPending ? (
          <ContentSkeleton rows={2} />
        ) : invites.isError ? (
          <ErrorState message={examError(invites.error)} />
        ) : (
          invites.data.pages
            .flatMap((p) => p.items)
            .map((inv) => (
              <article
                key={inv.id}
                className="space-y-2 rounded-xl border border-border p-3"
              >
                <p className="break-all text-sm">
                  {inv.email} · {t(inv.role)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(inv.status)} ·{" "}
                  {new Date(inv.expires_at).toLocaleDateString(locale)}
                </p>
                {inv.status === "pending" &&
                  (org.role === "owner" || inv.role !== "admin") && (
                    <Button
                      className="min-h-11"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void perform(() => institutions.revoke(org.id, inv))
                      }
                    >
                      {t("Revoke invitation")}
                    </Button>
                  )}
              </article>
            ))
        )}
        {invites.hasNextPage && (
          <Button
            className="min-h-11"
            variant="outline"
            disabled={invites.isFetchingNextPage}
            onClick={() => void invites.fetchNextPage()}
          >
            {t("More invitations")}
          </Button>
        )}
      </section>
      <ReasonDialog
        open={!!change}
        onOpenChange={(v) => {
          if (!v) setChange(null);
        }}
        title={t(
          change?.remove
            ? "Remove institution member"
            : "Change institution role",
        )}
        description={t(
          "Owned classes become standalone if teaching membership is removed. Class enrollment and coursework are retained.",
        )}
        onConfirm={async (reason) => {
          if (!change) return;
          await institutions.member(
            org.id,
            change.member,
            change.role,
            reason,
            change.remove,
          );
          setChange(null);
          await refresh();
        }}
      />
    </div>
  );
}
function RoleSelect({
  value,
  onChange,
  owner,
  disabled = false,
}: {
  value: InstitutionRole;
  onChange: (r: InstitutionRole) => void;
  owner: boolean;
  disabled?: boolean;
}) {
  const { t } = usePreferences();
  return (
    <label className="grid gap-1 text-sm">
      {t("Institution role")}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as InstitutionRole)}
        className={field}
      >
        {(owner ? ["student", "teacher", "admin"] : ["student", "teacher"]).map(
          (r) => (
            <option key={r} value={r}>
              {t(r)}
            </option>
          ),
        )}
      </select>
    </label>
  );
}
function MemberRow({
  member,
  actor,
  owner,
  busy,
  onChange,
}: {
  member: InstitutionMember;
  actor: string;
  owner: boolean;
  busy: boolean;
  onChange: (r: InstitutionRole, remove: boolean) => void;
}) {
  const { t } = usePreferences(),
    [role, setRole] = useState(member.role);
  const allowed =
    member.id !== actor &&
    member.role !== "owner" &&
    (owner || member.role !== "admin");
  return (
    <article className="space-y-2 rounded-xl border border-border p-3">
      <p className="break-words font-medium">{member.name}</p>
      <p className="break-all text-xs text-muted-foreground">
        {member.email} · {t(member.role)}
      </p>
      {allowed && (
        <>
          <RoleSelect
            value={role}
            onChange={setRole}
            owner={owner}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy || role === member.role}
              onClick={() => onChange(role, false)}
            >
              {t("Change role")}
            </Button>
            <Button
              className="min-h-11"
              variant="ghost"
              disabled={busy}
              onClick={() => onChange(member.role, true)}
            >
              {t("Remove member")}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
