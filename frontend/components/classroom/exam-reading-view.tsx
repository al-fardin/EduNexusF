"use client";
import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import {
  DEFAULT_EXAM_DISPLAY,
  parseExamDisplay,
  focusExamQuestion,
  type ExamDisplay,
} from "@/lib/exam-display";
import type { ExamQuestion } from "@/services/exams";
const defaults = JSON.stringify(DEFAULT_EXAM_DISPLAY),
  memory = new Map<string, string>();
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("edunexus:exam-display", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("edunexus:exam-display", fn);
  };
}
export function ExamReadingView({
  children,
  questions,
  className = "",
}: {
  children: React.ReactNode;
  questions: ExamQuestion[];
  className?: string;
}) {
  const user = useAuthStore((s) => s.user?.id ?? "anonymous"),
    key = `edunexus:exam-display:${user}`,
    { t } = usePreferences();
  const raw = useSyncExternalStore(
      subscribe,
      () => {
        try {
          return localStorage.getItem(key) ?? memory.get(key) ?? defaults;
        } catch {
          return memory.get(key) ?? defaults;
        }
      },
      () => defaults,
    ),
    settings = parseExamDisplay(raw);
  function change(patch: Partial<ExamDisplay>) {
    const next = JSON.stringify({ ...settings, ...patch });
    memory.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {}
    window.dispatchEvent(new Event("edunexus:exam-display"));
  }
  return (
    <section
      className={`en-exam-reading min-w-0 ${className}`}
      data-exam-size={settings.size}
      data-exam-contrast={settings.contrast}
      data-image-descriptions={settings.descriptions}
    >
      <details className="mb-3 min-w-0 rounded-xl border border-border bg-card p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          {t("Exam display & navigation")}
        </summary>
        <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm">
            {t("Question text size")}
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-background p-2"
              value={settings.size}
              onChange={(e) =>
                change({ size: e.target.value as ExamDisplay["size"] })
              }
            >
              {["standard", "large", "larger"].map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-sm">
            {t("Jump to question")}
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-background p-2"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) focusExamQuestion(e.target.value);
              }}
            >
              <option value="">{t("Choose a question")}</option>
              {questions.map((q, i) => (
                <option key={q.id} value={q.id}>
                  {i + 1}. {q.prompt.slice(0, 70)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.contrast}
              onChange={(e) => change({ contrast: e.target.checked })}
            />
            {t("High contrast")}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.descriptions}
              onChange={(e) => change({ descriptions: e.target.checked })}
            />
            {t("Show image descriptions")}
          </label>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-border p-2 text-sm"
            onClick={() => change(DEFAULT_EXAM_DISPLAY)}
          >
            {t("Reset exam display")}
          </button>
          <p className="text-xs text-muted-foreground">
            {t(
              "Use Tab to move between controls; arrow keys choose radio answers and Space selects checkboxes.",
            )}
          </p>
        </div>
      </details>
      {children}
    </section>
  );
}
