"use client";
import { usePreferences } from "@/providers/preferences-provider";
export function AccessibilitySettings() {
  const { t, language, size, setLanguage, setSize } = usePreferences();
  return (
    <section className="my-6 space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{t("Language and accessibility")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          {t("Language")}
          <select
            aria-label={t("Language")}
            className="rounded-xl border border-border bg-background p-3"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "bn")}
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          {t("Text size")}
          <select
            aria-label={t("Text size")}
            className="rounded-xl border border-border bg-background p-3"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {["standard", "large", "larger"].map((v) => (
              <option key={v} value={v}>
                {t(v[0].toUpperCase() + v.slice(1))}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
