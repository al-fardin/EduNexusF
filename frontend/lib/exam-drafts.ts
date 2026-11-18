export type ExamDraft = {
  answers: Record<string, string>;
  serverRevision: number;
  at: number;
  expiresAt: string;
};
const key = (userId: string, attemptId: string) =>
  `en-exam-draft-v2:${userId}:${attemptId}`;
export function sameAnswers(
  a: Record<string, string>,
  b: Record<string, string>,
) {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}
// Storage can be unavailable independently (privacy settings or exhausted quota).
function readStoredDraft(
  storage: () => Storage,
  draftKey: string,
): ExamDraft | null {
  try {
    const raw = storage().getItem(draftKey);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ExamDraft;
    if (
      !draft ||
      !draft.answers ||
      Array.isArray(draft.answers) ||
      typeof draft.answers !== "object" ||
      Object.values(draft.answers).some((v) => typeof v !== "string") ||
      !Number.isSafeInteger(draft.serverRevision) ||
      draft.serverRevision < 0 ||
      !Number.isFinite(draft.at) ||
      Date.now() - draft.at > 48 * 3600000
    )
      return null;
    return draft;
  } catch {
    return null;
  }
}
export function readExamDraft(
  userId: string,
  attemptId: string,
): ExamDraft | null {
  if (!userId || typeof window === "undefined") return null;
  const draftKey = key(userId, attemptId);
  const durable = readStoredDraft(() => window.localStorage, draftKey);
  const session = readStoredDraft(() => window.sessionStorage, draftKey);
  // A quota failure can leave an older durable copy alongside a newer fallback.
  return session && (!durable || session.at >= durable.at) ? session : durable;
}
export function saveExamDraft(
  userId: string,
  attemptId: string,
  draft: ExamDraft,
): boolean {
  if (!userId || typeof window === "undefined") return false;
  const draftKey = key(userId, attemptId);
  try {
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {}
    // False still warns that recovery after closing the browser is unavailable.
    return false;
  }
  try {
    window.sessionStorage.removeItem(draftKey);
  } catch {}
  return true;
}
export function removeExamDraft(userId: string, attemptId: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(userId, attemptId));
  } catch {}
  try {
    window.sessionStorage.removeItem(key(userId, attemptId));
  } catch {}
  // Legacy fallback has no account owner, so it is only cleaned up, never adopted.
  try {
    window.sessionStorage.removeItem(`en-exam-v15:${attemptId}`);
  } catch {}
}
