import { examService } from "@/services/exams";
import { useAuthStore } from "@/store/auth-store";
import {
  clearActiveExam,
  readActiveExam,
  rememberActiveExam,
} from "./exam-resume";

export type ExamSelection = { taking: string | null; entryExam: string | null };
export const emptyExamSelection = (): ExamSelection => ({
  taking: null,
  entryExam: null,
});

export async function restoreExamSelection(
  classroomId: string,
  signal?: AbortSignal,
): Promise<ExamSelection> {
  const owner = useAuthStore.getState().user?.id;
  const assertOwner = () => {
    signal?.throwIfAborted();
    if (useAuthStore.getState().user?.id !== owner)
      throw new Error("Exam account changed during restoration.");
  };
  assertOwner();
  const saved = readActiveExam(classroomId);
  if (!saved) return emptyExamSelection();
  if (saved.phase === "entry") return { taking: null, entryExam: saved.examId };
  try {
    const data = await examService.attempt(classroomId, saved.examId);
    assertOwner();
    const expires = Math.min(
      Date.parse(data.attempt.expires_at),
      Date.parse(data.exam.ends_at),
    );
    if (
      data.attempt.status === "in_progress" &&
      Number.isFinite(expires) &&
      expires > Date.now()
    )
      return { taking: saved.examId, entryExam: null };
    clearActiveExam(classroomId, saved.examId);
    return emptyExamSelection();
  } catch (error) {
    assertOwner();
    if ((error as { response?: { status?: number } })?.response?.status !== 404)
      throw error;
    rememberActiveExam(classroomId, saved.examId, "entry");
    return { taking: null, entryExam: saved.examId };
  }
}
