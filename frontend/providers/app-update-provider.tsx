"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePreferences } from "@/providers/preferences-provider";

declare global {
  interface Window {
    EduNexusApp?: {
      version: () => string;
      installUpdate?: (
        code: number,
        sha256: string,
        certificate: string,
        size: number,
      ) => void;
      keepCallAlive?: (
        id: string,
        session: string,
        token: string,
        video: boolean,
      ) => void;
      stopCallService?: (id: string) => void;
      updateCallToken?: (id: string, token: string) => void;
      setSpeaker?: (enabled: boolean) => void;
      resetAudio?: () => void;
    };
  }
}
export type AndroidRelease = {
  version_code: number;
  version_name: string;
  url: string;
  sha256: string;
  notes: string;
  certificate_sha256?: string;
  size_bytes?: number;
};
function subscribe(callback: () => void) {
  window.addEventListener("edunexus:native-ready", callback);
  return () => window.removeEventListener("edunexus:native-ready", callback);
}
function snapshot() {
  try {
    return window.EduNexusApp?.version() ?? "{}";
  } catch {
    return "{}";
  }
}
function useInstalled() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  try {
    const value = JSON.parse(raw);
    return {
      code: Number.isSafeInteger(value.code) ? Number(value.code) : 0,
      name: typeof value.name === "string" ? value.name : "",
    };
  } catch {
    return { code: 0, name: "" };
  }
}
function useRelease(enabled: boolean) {
  return useQuery({
    queryKey: ["android-release"],
    queryFn: async () =>
      (await api.get<{ data: AndroidRelease | null }>("/app/releases/android"))
        .data.data,
    enabled,
    staleTime: 3600000,
    refetchInterval: 3600000,
  });
}
function UpdateAction({ release }: { release: AndroidRelease }) {
  const { t } = usePreferences();
  const [state, setState] = useState({
    phase: "idle",
    progress: 0,
    message: "",
  });
  const native =
    typeof window !== "undefined" && !!window.EduNexusApp?.installUpdate;
  useEffect(() => {
    const changed = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (
        !value ||
        !["downloading", "verifying", "ready", "permission", "error"].includes(
          value.state,
        )
      )
        return;
      setState({
        phase: value.state,
        progress: Math.max(0, Math.min(100, Number(value.progress) || 0)),
        message:
          typeof value.message === "string" ? value.message.slice(0, 300) : "",
      });
    };
    window.addEventListener("edunexus:update-state", changed);
    return () => window.removeEventListener("edunexus:update-state", changed);
  }, []);
  const busy = state.phase === "downloading" || state.phase === "verifying";
  return (
    <div className="space-y-3">
      {native && release.certificate_sha256 && release.size_bytes ? (
        <Button
          disabled={busy}
          onClick={() => {
            setState({
              phase: "downloading",
              progress: 0,
              message: t("Starting update…"),
            });
            try {
              window.EduNexusApp!.installUpdate!(
                release.version_code,
                release.sha256,
                release.certificate_sha256!,
                release.size_bytes!,
              );
            } catch {
              setState({
                phase: "error",
                progress: 0,
                message: t("Could not start update."),
              });
            }
          }}
        >
          {t(busy ? "Updating…" : "Verify & install update")}
        </Button>
      ) : (
        <a className="en-outline-button" href={release.url} download>
          {t("Download APK")}
        </a>
      )}
      {busy && (
        <progress
          className="h-2 w-full accent-primary"
          max={100}
          value={state.progress}
          aria-label={t("App update progress")}
        />
      )}{" "}
      {state.message && (
        <p
          role={state.phase === "error" ? "alert" : "status"}
          className="text-sm"
        >
          {t(state.message)}
        </p>
      )}
      <details className="rounded-xl border border-border p-3 text-xs">
        <summary>{t("Release details")}</summary>
        <p className="mt-2 whitespace-pre-wrap">{release.notes}</p>
        {release.size_bytes && (
          <p className="mt-2">{(release.size_bytes / 1048576).toFixed(1)} MB</p>
        )}
        <p className="mt-2 break-all">SHA-256: {release.sha256}</p>
      </details>
    </div>
  );
}
export function AppUpdateProvider() {
  const { t } = usePreferences(),
    installed = useInstalled();
  const [dismissed, setDismissed] = useState(0),
    [open, setOpen] = useState(false);
  const query = useRelease(installed.code > 0),
    release = query.data;
  if (
    !release ||
    !installed.code ||
    release.version_code <= installed.code ||
    release.version_code === dismissed ||
    release.url !== "/downloads/EduNexus-release.apk"
  )
    return null;
  return (
    <>
      <aside className="en-app-update" role="status">
        <Download size={20} />
        <div>
          <strong>EduNexus {release.version_name}</strong>
          <p>{t("An app update is available.")}</p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {t("Update")}
        </Button>
        <button
          className="en-icon-button"
          aria-label={t("Dismiss update")}
          onClick={() => setDismissed(release.version_code)}
        >
          <X size={17} />
        </button>
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EduNexus {release.version_name}</DialogTitle>
            <DialogDescription>{t("Android update")}</DialogDescription>
          </DialogHeader>
          <UpdateAction release={release} />
        </DialogContent>
      </Dialog>
    </>
  );
}
export function AndroidReleaseSettings() {
  const { t } = usePreferences(),
    installed = useInstalled(),
    query = useRelease(true);
  const release = query.data;
  return (
    <section className="my-6 space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("Android app")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {installed.code
              ? `${t("Installed version")}: ${installed.name}`
              : t("Web app")}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {t("Check for updates")}
        </Button>
      </div>
      {query.isError ? (
        <p role="alert" className="text-sm">
          {t("Update information is unavailable.")}
        </p>
      ) : query.isPending ? (
        <p role="status" className="text-sm">
          {t("Checking…")}
        </p>
      ) : !release ? (
        <p className="text-sm text-muted-foreground">
          {t("No Android release is available yet.")}
        </p>
      ) : installed.code >= release.version_code ? (
        <p className="text-sm text-muted-foreground">
          {t("Your app is up to date.")}
        </p>
      ) : (
        <>
          <p className="text-sm">EduNexus {release.version_name}</p>
          <UpdateAction release={release} />
        </>
      )}
    </section>
  );
}
