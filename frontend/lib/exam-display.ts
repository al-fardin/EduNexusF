export type ExamDisplay = {
  size: "standard" | "large" | "larger";
  contrast: boolean;
  descriptions: boolean;
};
export const DEFAULT_EXAM_DISPLAY: ExamDisplay = {
  size: "standard",
  contrast: false,
  descriptions: false,
};
export function parseExamDisplay(raw: string): ExamDisplay {
  try {
    const v = JSON.parse(raw);
    return {
      size: v?.size === "large" || v?.size === "larger" ? v.size : "standard",
      contrast: v?.contrast === true,
      descriptions: v?.descriptions === true,
    };
  } catch {
    return { ...DEFAULT_EXAM_DISPLAY };
  }
}
export function focusExamQuestion(id: string) {
  const node = document.getElementById(`exam-answer-${id}`);
  if (!node) return;
  node.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
  node.focus({ preventScroll: true });
}
