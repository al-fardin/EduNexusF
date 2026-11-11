"use client";
import { useEffect } from "react";
import { usePreferences } from "@/providers/preferences-provider";
import { reportClientError } from "@/lib/telemetry";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { t } = usePreferences();
  useEffect(() => {
    reportClientError("boundary");
  }, []);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">{t("An error occurred")}</h1>
      <button type="button" className="en-solid-button" onClick={retry}>
        {t("Try again")}
      </button>
    </main>
  );
}
