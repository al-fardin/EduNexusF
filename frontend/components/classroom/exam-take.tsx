"use client";

import { useAuthStore } from "@/store/auth-store";
import {
  readExamDraft,
  saveExamDraft,
  removeExamDraft,
  sameAnswers,
} from "@/lib/exam-drafts";
import { StudentDesktopPair } from "@/components/classroom/desktop-monitoring";

import { StudentExamMonitor } from "@/components/classroom/exam-monitoring";

import { CodingWorkbench } from "@/components/classroom/coding-workbench";
import { codingService } from "@/services/coding";
import { clearActiveExam } from "@/lib/exam-resume";

import {
  Clock3,
  Send,
  CheckCircle2,
  Save,
  LockKeyhole,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { examError, examService, type LiveExam } from "@/services/exams";

import { field, primary, outline, panel, dateLabel } from "./exam-presentation";

const readOnline = () => navigator.onLine;
function subscribeNetwork(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

export function ExamTake({
  classroomId,
  examId,
  onClose,
}: {
  classroomId: string;
  examId: string;
  onClose: () => void;
}) {
  const [live, setLive] = useState<LiveExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [now, setNow] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const dirty = useRef(false);
  const answersRef = useRef(answers);
  const savingRef = useRef(false);
  const revision = useRef(0);
  // Phase 15: durable draft during the browser tab session and versioned server saves.
  const serverRevision = useRef(0);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const submittingRef = useRef(false);
  const online = useSyncExternalStore(subscribeNetwork, readOnline, () => true);
  const [conflictDraft, setConflictDraft] = useState<Record<
    string,
    string
  > | null>(null);
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const [clockOffset, setClockOffset] = useState(0);

  const storeDraft = useCallback(
    (next: Record<string, string>) => {
      if (!live || submitted) return;
      if (
        !saveExamDraft(userId, live.attempt.id, {
          answers: next,
          serverRevision: serverRevision.current,
          at: Date.now(),
          expiresAt: live.attempt.expires_at,
        })
      )
        setSaved(
          "Browser storage unavailable — keep this page open until saved",
        );
    },
    [live, submitted, userId],
  );
  const removeDraft = useCallback(() => {
    if (live)
      try {
        removeExamDraft(userId, live.attempt.id);
      } catch {}
  }, [live, userId]);

  const syncAnswers = useCallback(async (): Promise<boolean> => {
    if (!live || submitted) return false;
    if (savePromiseRef.current) return savePromiseRef.current;
    if (conflictDraft) return false;
    if (!dirty.current) return true;
    if (!navigator.onLine) {
      setSaved("Offline — draft kept in this browser");
      return false;
    }
    const snapshot = { ...answersRef.current };
    const localRevision = revision.current;
    const expected = serverRevision.current;
    const running = (async () => {
      savingRef.current = true;
      setSaving(true);
      try {
        const persisted = await examService.save(
          classroomId,
          examId,
          snapshot,
          expected,
        );
        serverRevision.current = persisted.revision;
        if (localRevision === revision.current) {
          dirty.current = false;
          removeDraft();
          setSaved("Saved at " + new Date().toLocaleTimeString());
        } else {
          storeDraft(answersRef.current);
          setSaved("New edits waiting to save");
        }
        setError("");
        return true;
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response
          ?.status;
        if (status === 409) {
          try {
            const latest = await examService.attempt(classroomId, examId);
            serverRevision.current = latest.attempt.revision;
            if (sameAnswers(snapshot, latest.attempt.answers)) {
              if (localRevision === revision.current) {
                dirty.current = false;
                removeDraft();
              } else {
                storeDraft(answersRef.current);
              }
              setError("");
              setSaved("Save confirmed by server");
              return true;
            }
            setConflictDraft({ ...answersRef.current });
            answersRef.current = latest.attempt.answers;
            setAnswers(latest.attempt.answers);
          } catch {}
        }
        setError(examError(e));
        setSaved("Not synced — local draft retained");
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    })();
    savePromiseRef.current = running;
    try {
      return await running;
    } finally {
      if (savePromiseRef.current === running) savePromiseRef.current = null;
    }
  }, [
    live,
    submitted,
    conflictDraft,
    classroomId,
    examId,
    removeDraft,
    storeDraft,
  ]);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    examService
      .attempt(classroomId, examId)
      .catch((err) => {
        if (err?.response?.status === 404)
          return examService.start(classroomId, examId);
        throw err;
      })
      .then((data) => {
        if (!mounted) return;
        serverRevision.current = data.attempt.revision ?? 0;
        setClockOffset(Date.parse(data.server_time) - Date.now());
        let recovered = data.attempt.answers;
        if (data.attempt.status === "in_progress") {
          try {
            const local = readExamDraft(userId, data.attempt.id);
            if (local) {
              if (
                local.answers &&
                typeof local.answers === "object" &&
                !sameAnswers(local.answers, recovered)
              ) {
                if (local.serverRevision === serverRevision.current) {
                  recovered = local.answers;
                  dirty.current = true;
                  revision.current++;
                  setSaved("Unsynced draft restored. Saving when online.");
                } else {
                  setConflictDraft(local.answers);
                  setError(
                    "A newer answer version exists on the server. Review your local draft before restoring.",
                  );
                }
              }
            }
          } catch {}
        }
        if (
          data.attempt.status !== "in_progress" ||
          Date.parse(data.attempt.expires_at) <= Date.now()
        ) {
          clearActiveExam(classroomId, examId);
        }
        setLive(data);
        setAnswers(recovered);
        answersRef.current = recovered;
        setSubmitted(data.attempt.status === "submitted");
      })
      .catch((e) => {
        if (mounted) setError(examError(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [classroomId, examId, userId]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!live || submitted) return;
    const changed = () => {
      const kind =
        document.visibilityState === "hidden"
          ? "visibility_hidden"
          : "visibility_visible";
      void codingService
        .activity(classroomId, examId, [
          { kind, question_id: "", magnitude: 0 },
        ])
        .catch(() => undefined);
    };
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, [classroomId, examId, live, submitted]);
  // Local draft is written immediately on change. Server saves serialize and use CAS.
  useEffect(() => {
    if (!live || submitted) return;
    const timer = window.setInterval(() => {
      if (
        dirty.current &&
        !submittingRef.current &&
        Date.now() + clockOffset < Date.parse(live.attempt.expires_at)
      )
        void syncAnswers();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [live, submitted, clockOffset, syncAnswers]);
  useEffect(() => {
    if (online && dirty.current && live && !submitted) void syncAnswers();
  }, [online, live, submitted, syncAnswers]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current && !submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [submitted]);

  function change(id: string, value: string) {
    if (submittingRef.current || submitted) return;
    const next = { ...answersRef.current, [id]: value };
    answersRef.current = next;
    setAnswers(next);
    dirty.current = true;
    revision.current += 1;
    storeDraft(next);
    setSaved("Unsaved changes");
  }
  async function save() {
    if (!live) return;
    await syncAnswers();
  }
  async function submit() {
    if (
      !live ||
      submittingRef.current ||
      !window.confirm(
        "Submit your final answers? You cannot change them afterward.",
      )
    )
      return;
    submittingRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (savePromiseRef.current) await savePromiseRef.current;
      for (let i = 0; i < 3 && dirty.current; i++) {
        if (!(await syncAnswers())) break;
      }
      if (dirty.current) {
        setError(
          "Your latest answers are not yet saved. Reconnect or resolve the save conflict before submitting.",
        );
        return;
      }
      const final = await examService.submit(
        classroomId,
        examId,
        answersRef.current,
        serverRevision.current,
      );
      serverRevision.current = final.revision;
      setLive((current) =>
        current ? { ...current, attempt: final } : current,
      );
      setSubmitted(true);
      dirty.current = false;
      removeDraft();
      clearActiveExam(classroomId, examId);
      setSaved("Submitted successfully");
    } catch (e) {
      // A response may be lost after the server successfully committed submission.
      try {
        const check = await examService.attempt(classroomId, examId);
        if (check.attempt.status === "submitted") {
          setLive(check);
          setSubmitted(true);
          dirty.current = false;
          removeDraft();
          clearActiveExam(classroomId, examId);
          setSaved("Submission confirmed by server");
          return;
        }
      } catch {}
      setError(
        examError(e) +
          " — submission not confirmed; try again after checking your connection.",
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }
  const until = live
    ? Math.min(
        Date.parse(live.attempt.expires_at),
        Date.parse(live.exam.ends_at),
      )
    : 0;
  const left = Math.max(0, Math.floor((until - (now + clockOffset)) / 1000));
  const timedOut = Boolean(live) && left <= 0;
  return (
    <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold">
          {live?.exam.title ?? "Exam session"}
        </h3>
        <button className={outline} onClick={onClose}>
          <ArrowLeft size={16} /> Back to exams
        </button>
      </div>
      {(loading || Boolean(live && !now)) && <ExamSessionSkeleton />}
      {!online && (
        <p
          role="status"
          className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Offline: your draft is stored in this browser. Reconnect before the
          deadline to submit.
        </p>
      )}
      {conflictDraft && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"
        >
          Another tab/device saved a newer answer version. Your local draft is
          retained.{" "}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => {
              if (
                !window.confirm(
                  "Replace the newer server answers with your older local draft? This will overwrite other changes.",
                )
              )
                return;
              answersRef.current = conflictDraft;
              setAnswers(conflictDraft);
              revision.current++;
              dirty.current = true;
              setConflictDraft(null);
              setError("");
              storeDraft(conflictDraft);
            }}
          >
            Replace server answers with my local draft
          </button>{" "}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => {
              removeDraft();
              dirty.current = false;
              setConflictDraft(null);
              setError("");
            }}
          >
            Keep newer server answers
          </button>
        </div>
      )}
      {error && (
        <p
          className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      {live && now > 0 && (
        <>
          {live.attempt.entry_mode !== "mobile" && (
            <StudentDesktopPair classroomId={classroomId} examId={examId} />
          )}
          {live.attempt.entry_mode !== "mobile" && (
            <StudentExamMonitor
              classroomId={classroomId}
              examId={examId}
              attemptId={live.attempt.id}
              expiresAt={live.attempt.expires_at}
              active={!submitted && !timedOut}
            />
          )}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold">
              <Clock3 size={16} />
              {String(Math.floor(left / 3600)).padStart(2, "0")}:
              {String(Math.floor(left / 60) % 60).padStart(2, "0")}:
              {String(left % 60).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">
              Ends {dateLabel(live.attempt.expires_at)}
            </span>
          </div>
          {submitted ? (
            <div className="rounded-xl bg-secondary p-5">
              <CheckCircle2 className="mb-2 text-primary" />
              <p className="font-semibold">Your exam has been submitted.</p>
              <p className="mt-2 text-sm">Receipt: {live.attempt.id}</p>
              <p className="text-sm">
                Submitted{" "}
                {live.attempt.submitted_at
                  ? dateLabel(live.attempt.submitted_at)
                  : "Confirmed"}{" "}
                · Revision {live.attempt.revision}
              </p>
            </div>
          ) : timedOut ? (
            <div className="rounded-xl bg-secondary p-5">
              <LockKeyhole className="mb-2" />
              <p className="font-semibold">Time has expired.</p>
              <p className="mt-1 text-sm">
                You cannot change or submit new answers. Any answers saved
                before the deadline are retained for teacher review.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {live.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="rounded-[22px_10px_18px_12px] border border-border bg-background p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <p className="font-semibold">
                        {i + 1}. {q.prompt}
                      </p>
                      <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-xs">
                        {q.points} pts
                      </span>
                    </div>
                    {q.kind === "mcq" ? (
                      <div className="space-y-2">
                        {q.options?.map((o, j) => (
                          <label
                            key={j}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === String(j)}
                              onChange={() => change(q.id, String(j))}
                            />
                            {o}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          {q.kind === "coding"
                            ? `Code answer (${q.language || "text"}). Code can be run in the isolated compiler when enabled.`
                            : "Written response"}
                        </p>
                        {q.kind === "coding" ? (
                          <CodingWorkbench
                            classroomId={classroomId}
                            examId={examId}
                            questionId={q.id}
                            tester={q.tester}
                            language={q.language || "other"}
                            code={answers[q.id] ?? ""}
                            onChange={(value) => change(q.id, value)}
                          />
                        ) : (
                          <textarea
                            value={answers[q.id] ?? ""}
                            onChange={(e) => change(q.id, e.target.value)}
                            maxLength={8000}
                            spellCheck
                            rows={6}
                            className={field}
                            placeholder="Type your answer..."
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className={outline}
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}{" "}
                  {saving ? "Saving…" : "Save progress"}
                </button>
                <button
                  className={primary}
                  disabled={saving}
                  onClick={() => void submit()}
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}{" "}
                  {saving ? "Processing…" : "Submit final answers"}
                </button>
                <span className="text-xs text-muted-foreground" role="status">
                  {saved}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
function ExamSessionSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Joining exam">
      <div className="flex items-center gap-3">
        <LoaderCircle size={18} className="animate-spin text-foreground" />
        <span className="text-sm text-muted-foreground">Loading exam…</span>
      </div>
      <div className="en-skeleton h-10 w-36 rounded-xl" />
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="rounded-[24px] border border-border bg-background p-5"
        >
          <div className="en-skeleton h-5 w-2/3 rounded-lg" />
          <div className="en-skeleton mt-5 h-12 w-full rounded-xl" />
          <div className="en-skeleton mt-3 h-12 w-full rounded-xl" />
        </div>
      ))}
      <span className="sr-only">Exam details are loading…</span>
    </div>
  );
}
