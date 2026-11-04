"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Download, X } from "lucide-react";
declare global {
  interface Window {
    EduNexusApp?: { version: () => string };
  }
}
type Release = {
  version_code: number;
  version_name: string;
  url: string;
  sha256: string;
  notes: string;
};
export function AppUpdateProvider() {
  const [installed, setInstalled] = useState(0);
  const [dismissed, setDismissed] = useState(0);
  useEffect(() => {
    const read = () => {
      try {
        setInstalled(
          JSON.parse(window.EduNexusApp?.version() ?? "{}").code ?? 0,
        );
      } catch {}
    };
    read();
    window.addEventListener("edunexus:native-ready", read);
    return () => window.removeEventListener("edunexus:native-ready", read);
  }, []);
  const release = useQuery({
    queryKey: ["android-release"],
    queryFn: async () =>
      (await api.get<{ data: Release | null }>("/app/releases/android")).data
        .data,
    enabled: installed > 0,
    staleTime: 3600000,
    refetchInterval: 3600000,
  });
  const update = release.data;
  if (
    !update ||
    !installed ||
    update.version_code <= installed ||
    update.version_code === dismissed ||
    update.url !== "/downloads/EduNexus-release.apk"
  )
    return null;
  return (
    <aside className="en-app-update" role="status">
      <Download size={20} />
      <div>
        <strong>EduNexus {update.version_name}</strong>
        <p>An app update is available.</p>
      </div>
      <a className="en-outline-button" href={update.url} download>
        Download
      </a>
      <button
        className="en-icon-button"
        aria-label="Dismiss update"
        onClick={() => setDismissed(update.version_code)}
      >
        <X size={17} />
      </button>
    </aside>
  );
}
