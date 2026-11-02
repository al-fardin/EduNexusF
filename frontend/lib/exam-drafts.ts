export type ExamDraft = { answers: Record<string, string>; serverRevision: number; at: number; expiresAt: string };
const key = (userId: string, attemptId: string) => `en-exam-draft-v2:${userId}:${attemptId}`;
export function sameAnswers(a: Record<string,string>, b: Record<string,string>) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k]);
}
export function readExamDraft(userId: string, attemptId: string): ExamDraft | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(userId, attemptId)) ?? window.sessionStorage.getItem(`en-exam-v15:${attemptId}`);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ExamDraft;
    if (!draft.answers || Array.isArray(draft.answers) || typeof draft.answers !== "object" ||
      Object.values(draft.answers).some(v => typeof v !== "string") || !Number.isSafeInteger(draft.serverRevision) ||
      draft.serverRevision < 0 || !Number.isFinite(draft.at) || Date.now() - draft.at > 48 * 3600000) return null;
    return draft;
  } catch { return null; }
}
export function saveExamDraft(userId: string, attemptId: string, draft: ExamDraft): boolean {
  if (!userId || typeof window === "undefined") return false;
  try { window.localStorage.setItem(key(userId, attemptId), JSON.stringify(draft)); return true; }
  catch { try { window.sessionStorage.setItem(`en-exam-v15:${attemptId}`, JSON.stringify(draft)); } catch {} return false; }
}
export function removeExamDraft(userId: string, attemptId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(userId, attemptId));
  window.sessionStorage.removeItem(`en-exam-v15:${attemptId}`);
}
