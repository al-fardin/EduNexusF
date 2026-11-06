import { clientId } from "@/lib/client-id";

import { type ExamQuestion, type QuestionKind } from "@/services/exams";

export const field =
  "w-full rounded-[19px_10px_17px_13px] border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-[#b6c1b2]";
export const primary =
  "inline-flex items-center justify-center gap-2 rounded-[21px_10px_18px_12px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-muted-foreground disabled:opacity-50";
export const outline =
  "inline-flex items-center justify-center gap-2 rounded-[19px_10px_17px_12px] border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";
export const panel =
  "rounded-[30px_14px_27px_18px] border border-border bg-card p-5 shadow-[0_10px_30px_rgba(56,40,29,0.06)] sm:p-6";
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
