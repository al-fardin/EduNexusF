import { useAuthStore } from "@/store/auth-store";
/** Classroom-scoped exam navigation state for the current browser tab only. */
export type ExamResume = { examId: string; phase: "entry" | "active"; savedAt: number };
const key = (classroomId: string) => `en-active-exam-v2:${useAuthStore.getState().user?.id ?? "anonymous"}:${classroomId}`;
const allowedId = (id: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(id);

export function readActiveExam(classroomId: string): ExamResume | null {
  if (typeof window === "undefined" || !allowedId(classroomId)) return null;
  try {
    const raw = window.localStorage.getItem(key(classroomId));
    if (!raw) return null;
    const item = JSON.parse(raw) as Partial<ExamResume>;
    if (typeof item.examId !== "string" || !allowedId(item.examId) ||
      (item.phase !== "entry" && item.phase !== "active") ||
      typeof item.savedAt !== "number" || !Number.isFinite(item.savedAt) ||
      item.savedAt > Date.now() + 60_000 || Date.now() - item.savedAt > 24 * 60 * 60_000) {
      window.localStorage.removeItem(key(classroomId));
      return null;
    }
    return item as ExamResume;
  } catch { return null; }
}

export function rememberActiveExam(classroomId: string, examId: string, phase: ExamResume["phase"]): void {
  if (typeof window === "undefined" || !allowedId(classroomId) || !allowedId(examId)) return;
  try { window.localStorage.setItem(key(classroomId), JSON.stringify({ examId, phase, savedAt: Date.now() })); } catch {}
}

export function clearActiveExam(classroomId: string, expectedExamId?: string | null): void {
  if (typeof window === "undefined" || !allowedId(classroomId)) return;
  try {
    if (expectedExamId && readActiveExam(classroomId)?.examId !== expectedExamId) return;
    window.localStorage.removeItem(key(classroomId));
  } catch {}
}
