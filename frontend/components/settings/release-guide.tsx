"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { CURRENT_RELEASE } from "@/lib/release-info";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
function subscribe(callback: () => void) {
  window.addEventListener("edunexus:guide-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("edunexus:guide-changed", callback);
    window.removeEventListener("storage", callback);
  };
}
export function ReleaseGuide() {
  const account = useAuthStore((s) => s.user),
    user = account?.id,
    { t } = usePreferences(),
    path = usePathname(),
    [manual, setManual] = useState(false);
  const key = user ? `edunexus:guide:v1:${user}` : "";
  const seen = useSyncExternalStore(
    subscribe,
    () => {
      if (!key) return true;
      try {
        return localStorage.getItem(key) === "seen";
      } catch {
        return true;
      }
    },
    () => true,
  );
  useEffect(() => {
    const open = () => setManual(true);
    window.addEventListener("edunexus:open-guide", open);
    return () => window.removeEventListener("edunexus:open-guide", open);
  }, []);
  function close() {
    setManual(false);
    if (key) {
      try {
        localStorage.setItem(key, "seen");
      } catch {}
      window.dispatchEvent(new Event("edunexus:guide-changed"));
    }
  }
  return (
    <Dialog
      open={
        !!user &&
        path !== "/login" &&
        (manual || (account?.email_verified && !seen))
      }
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Your workspace, at a glance")}</DialogTitle>
          <DialogDescription>
            {t("A few shortcuts to get started.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {[
            ["/tasks", "Task inbox", "Find the work that needs your attention"],
            [
              "/classrooms",
              "Classroom",
              "Open your teaching and joined classes",
            ],
            [
              "/offline",
              "Saved work",
              "Read opened materials and continue drafts offline",
            ],
          ].map(([href, title, description]) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="block space-y-1 rounded-xl border border-border p-4"
            >
              <h2 className="font-semibold">{t(title)}</h2>
              <p className="text-sm text-muted-foreground">{t(description)}</p>
            </Link>
          ))}
        </div>
        <Button onClick={close}>{t("Get started")}</Button>
      </DialogContent>
    </Dialog>
  );
}
export function ReleaseHelp() {
  const { t } = usePreferences(),
    [open, setOpen] = useState(false);
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">{t("Help & updates")}</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event("edunexus:open-guide"))}
        >
          {t("Quick guide")}
        </Button>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {t("What's new")}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("What's new")} · {CURRENT_RELEASE.version}
            </DialogTitle>
            <DialogDescription>{CURRENT_RELEASE.date}</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-3 pl-5 text-sm">
            {CURRENT_RELEASE.changes.map((change) => (
              <li key={change}>{t(change)}</li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}
