import type { NewExam } from "@/services/exams";
import { previewItems } from "./question-import";
export type ReadinessIssue = {
  code: string;
  message: string;
  field: string;
  question_id?: string;
  severity: "error" | "warning";
};
export type ReadinessReport = {
  ready: boolean;
  total_points: number;
  issues: ReadinessIssue[];
};
export function inspectDraft(
  draft: NewExam,
  now = Date.now(),
): ReadinessReport {
  const issues: ReadinessIssue[] = [];
  const add = (
    code: string,
    message: string,
    field: string,
    question_id?: string,
    severity: ReadinessIssue["severity"] = "error",
  ) => issues.push({ code, message, field, question_id, severity });
  const bytes = (value: string) => new TextEncoder().encode(value).length;
  if (bytes(draft.title.trim()) < 3 || bytes(draft.title.trim()) > 200)
    add("title", "Use a title with 3–200 bytes", "title");
  if (bytes(draft.description ?? "") > 5000)
    add("description", "Description exceeds 5,000 bytes", "description");
  const start = Date.parse(draft.starts_at),
    end = Date.parse(draft.ends_at);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 30 * 24 * 3600000
  )
    add("window", "Choose a valid exam window of at most 30 days", "starts_at");
  else if (end <= now) add("ended", "The exam window has ended", "ends_at");
  if (
    !Number.isInteger(draft.duration_minutes) ||
    draft.duration_minutes < 1 ||
    draft.duration_minutes > 240
  )
    add("duration", "Duration must be 1–240 minutes", "duration_minutes");
  if (draft.questions.length < 1 || draft.questions.length > 40)
    add("count", "Use 1–40 questions", "questions");
  const seen = new Set<string>();
  for (const q of draft.questions) {
    if (!q.id || bytes(q.id) > 64 || seen.has(q.id))
      add(
        "id",
        "Question identifiers must be unique and use 1–64 bytes",
        "question",
        q.id,
      );
    seen.add(q.id);
  }
  if (draft.questions.length && draft.questions.length <= 40)
    previewItems(draft.questions).forEach((row, i) =>
      row.errors.forEach((message) =>
        add(
          "question",
          `Question ${i + 1}: ${message}`,
          "question",
          draft.questions[i].id,
        ),
      ),
    );
  if (draft.allow_mobile_mcq && draft.questions.some((q) => q.kind !== "mcq"))
    add(
      "mobile",
      "Phone access requires MCQ-only questions",
      "allow_mobile_mcq",
    );
  return {
    ready: !issues.some((i) => i.severity === "error"),
    total_points: draft.questions.reduce(
      (sum, q) => sum + (Number.isFinite(q.points) ? q.points : 0),
      0,
    ),
    issues,
  };
}
export function focusExamIssue(issue: ReadinessIssue) {
  const node = issue.question_id
    ? document.getElementById(`exam-question-${issue.question_id}`)
    : document.querySelector<HTMLElement>(`[data-exam-field="${issue.field}"]`);
  if (!node) return;
  node.scrollIntoView({
    block: "center",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
  const input = node.matches("input,textarea,select,button")
    ? node
    : node.querySelector<HTMLElement>("textarea,input,select");
  (input ?? node).focus({ preventScroll: true });
}
