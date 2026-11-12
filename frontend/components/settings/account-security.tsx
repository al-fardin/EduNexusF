"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ConfirmAction, ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
type Session = {
  id: string;
  device: string;
  created_at: string;
  last_seen_at: string;
  current: boolean;
};
export function AccountSecurity() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient(),
    router = useRouter(),
    { t, locale } = usePreferences();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revoke, setRevoke] = useState<Session | null>(null),
    [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null),
    [codes, setCodes] = useState<string[]>([]),
    [password, setPassword] = useState("");
  const status = useQuery({
    queryKey: ["account-security", user?.id],
    queryFn: async () =>
      (
        await api.get<{
          data: {
            enabled: boolean;
            recovery_remaining: number;
            setup_available: boolean;
          };
        }>("/auth/security")
      ).data.data,
  });
  const sessions = useQuery({
    queryKey: ["account-sessions", user?.id],
    queryFn: async () =>
      (await api.get<{ data: Session[] }>("/auth/security/sessions")).data.data,
    enabled: open,
  });
  function changed() {
    void client.invalidateQueries({ queryKey: ["account-security"] });
    void client.invalidateQueries({ queryKey: ["account-sessions"] });
  }
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      changed();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t("Account security")}</h2>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {t("Devices & verification")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          status.data?.enabled
            ? "Two-step verification is on"
            : "Manage your signed-in devices",
        )}
      </p>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (busy) return;
          setOpen(v);
          if (!v) {
            setSetup(null);
            setCodes([]);
            setPassword("");
            setError("");
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Account security")}</DialogTitle>
            <DialogDescription>
              {t("Signed-in devices and two-step verification")}
            </DialogDescription>
          </DialogHeader>
          {error && <ErrorState message={error} />}
          <h3 className="font-semibold">{t("Active devices")}</h3>
          {sessions.isPending ? (
            <ContentSkeleton rows={2} />
          ) : sessions.isError ? (
            <ErrorState
              message={examError(sessions.error)}
              onRetry={() => void sessions.refetch()}
            />
          ) : !sessions.data?.length ? (
            <p className="text-sm text-muted-foreground">
              {t("Sign in again to register this device")}
            </p>
          ) : (
            sessions.data.map((s) => (
              <article
                key={s.id}
                className="space-y-2 rounded-xl border border-border p-3"
              >
                <p className="break-words text-sm">
                  {s.device || t("Unknown device")}
                  {s.current ? ` · ${t("This device")}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Signed in")}:{" "}
                  {new Date(s.created_at).toLocaleString(locale)}
                  <br />
                  {t("Last refreshed")}:{" "}
                  {new Date(s.last_seen_at).toLocaleString(locale)}
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRevoke(s)}
                >
                  {t("Sign out device")}
                </Button>
              </article>
            ))
          )}
          {(user?.role === "instructor" || user?.role === "admin") && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="font-semibold">{t("Two-step verification")}</h3>
              {status.isError ? (
                <ErrorState message={examError(status.error)} />
              ) : status.isPending ? (
                <ContentSkeleton rows={1} />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {status.data.enabled
                      ? `${t("Enabled")} · ${status.data.recovery_remaining} ${t("recovery codes remaining")}`
                      : t("Use an authenticator app to protect sign-in")}
                  </p>
                  {!user.email_verified ? (
                    <p className="text-sm">
                      {t(
                        "Verify your email before enabling two-step verification",
                      )}
                    </p>
                  ) : !status.data.setup_available && !status.data.enabled ? (
                    <p className="text-sm text-muted-foreground">
                      {t("Authenticator setup awaits server configuration")}
                    </p>
                  ) : codes.length ? (
                    <div className="space-y-3 rounded-xl bg-secondary p-4">
                      <p className="text-sm font-medium">
                        {t(
                          "Save these recovery codes. They are shown only once.",
                        )}
                      </p>
                      <pre className="select-all whitespace-pre-wrap break-all text-sm">
                        {codes.join("\n")}
                      </pre>
                      <Button onClick={() => setCodes([])}>
                        {t("I saved my recovery codes")}
                      </Button>
                    </div>
                  ) : (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget),
                          code = String(data.get("code") || "");
                        const action = status.data.enabled
                          ? "disable"
                          : setup
                            ? "enable"
                            : "setup";
                        void act(async () => {
                          const res = await api.post(
                            `/auth/security/two-step/${action}`,
                            { password, code },
                          );
                          if (action === "setup") setSetup(res.data.data);
                          else {
                            setSetup(null);
                            setPassword("");
                            if (action === "enable")
                              setCodes(res.data.data.recovery_codes);
                          }
                        });
                      }}
                    >
                      <label className="grid gap-1 text-sm">
                        {t("Current password")}
                        <input
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={busy}
                          className="min-h-11 rounded-xl border border-border bg-background p-3"
                        />
                      </label>
                      {setup && (
                        <div className="space-y-2 rounded-xl bg-secondary p-3">
                          <p className="text-sm">
                            {t("Add this setup key in your authenticator app")}
                          </p>
                          <code className="block select-all break-all text-sm">
                            {setup.secret}
                          </code>
                        </div>
                      )}
                      {(setup || status.data.enabled) && (
                        <label className="grid gap-1 text-sm">
                          {t("Authenticator or recovery code")}
                          <input
                            name="code"
                            autoComplete="one-time-code"
                            required
                            maxLength={24}
                            disabled={busy}
                            className="min-h-11 rounded-xl border border-border bg-background p-3"
                          />
                        </label>
                      )}
                      <Button type="submit" disabled={busy}>
                        {t(
                          status.data.enabled
                            ? "Disable two-step verification"
                            : setup
                              ? "Confirm authenticator"
                              : "Set up authenticator",
                        )}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </section>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmAction
        open={!!revoke}
        onOpenChange={(v) => {
          if (!busy && !v) setRevoke(null);
        }}
        title={t("Sign out this device?")}
        description={t("This device will need to sign in again.")}
        busy={busy}
        onConfirm={() => {
          const session = revoke;
          if (!session) return;
          void act(async () => {
            await api.delete(`/auth/security/sessions/${session.id}`);
            setRevoke(null);
            if (session.current) {
              window.localStorage.removeItem("access_token");
              window.localStorage.removeItem("refresh_token");
              useAuthStore.getState().logout();
              router.replace("/login");
            }
          });
        }}
      />
    </section>
  );
}
