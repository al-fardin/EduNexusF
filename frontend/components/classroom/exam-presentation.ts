import { clientId } from "@/lib/client-id";

import { type ExamQuestion, type QuestionKind } from "@/services/exams";

export const field =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring/30";
export const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
export const outline =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";
export const panel =
  "rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6";
export function dateLabel(date: string) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
export function localDate(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
export function newQuestion(kind: QuestionKind = "mcq"): ExamQuestion {
  return {
    id: clientId(),
    kind,
    prompt: "",
    points: 10,
    options: ["", ""],
    correct_option: 0,
    sample_answer: "",
    language: "python",
  };
}
