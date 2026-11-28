"use client";
import { useAuthStore } from "@/store/auth-store";
import { clientId } from "@/lib/client-id";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ShieldAlert, ShieldCheck, LoaderCircle } from "lucide-react";
import { examMonitor } from "@/services/exam-monitor";
import { examError } from "@/services/exams";
import {
  monitorBridge as bridge,
  approvedExamKey,
} from "@/lib/exam-monitor-bridge";

// A resumed mount supersedes delayed cleanup from the previous screen.
let monitorOwner: symbol | null = null;

export function StudentExamMonitor({
  classroomId,
  examId,
  attemptId,
  expiresAt,
  active,
}: {
  classroomId: string;
  examId: string;
  attemptId: string;
  expiresAt: string;
  active: boolean;
}) {
  const userId = useAuthStore(s => s.user?.id ?? "");
  const [reconnect, setReconnect] = useState(0);
  const policy = useQuery({
    queryKey: ["monitor-policy", classroomId, examId],
    queryFn: () => examMonitor.policy(classroomId, examId),
    staleTime: 15000,
  });
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [problem, setProblem] = useState("");
  const [exitCount, setExitCount] = useState(0);
  const [exitNotice, setExitNotice] = useState(false);
  const inflight = useRef(false);
  const activeRef = useRef(active);
  // In Next.js development StrictMode, effect teardown can be followed by an
  // immediate remount. Do not treat that diagnostic cycle as leaving the exam.
  const mountedRef = useRef(false);
  const delayedStopRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const flush = useCallback(async () => {
    if (inflight.current || !activeRef.current) return;
    inflight.current = true;
    try {
      const peek = await bridge("PEEK");
      if (!peek.ok) throw new Error(peek.error || "Extension unavailable");
      setConnected(Boolean(peek.connected));
      const events = peek.events ?? [];
      if (!events.length) return;
      await examMonitor.events(classroomId, examId, events);
      const exits = events.filter((e) =>
        [
          "tab_switched",
          "window_blur",
          "window_minimized",
          "exam_tab_closed",
        ].includes(e.kind),
      ).length;
      if (exits) {
        setExitCount((n) => n + exits);
        setExitNotice(true);
      }
      const ack = await bridge("ACK", { ids: events.map((e) => e.id) });
      if (!ack.ok) throw new Error(ack.error || "Event acknowledgment failed");
      setProblem("");
    } catch (e) {
      setProblem(examError(e));
    } finally {
      inflight.current = false;
    }
  }, [classroomId, examId]);
  // The gate records consent BEFORE creating the attempt. No second checkbox.
  useEffect(() => {
    if (!active || !policy.data?.enabled) return;
    let cancelled = false;
    const connect = async () => {
      setConnecting(true);
      let sessionKey = window.sessionStorage.getItem(approvedExamKey(classroomId, examId, userId));
      if (!sessionKey) {
        try {
          const admitted = await examMonitor.admission(classroomId, examId);
          if (!admitted.admitted || admitted.attempt_id !== attemptId) throw new Error("This attempt has no saved monitoring consent.");
          const existing = await bridge("STATUS");
          sessionKey = existing.sessionKey?.startsWith(`exam-${examId}-${userId}-`)
            ? existing.sessionKey : `exam-${examId}-${userId}-${clientId()}`;
          if (!cancelled) window.sessionStorage.setItem(approvedExamKey(classroomId, examId, userId), sessionKey);
        } catch (error) {
          if (!cancelled) { setConnecting(false); setProblem(examError(error)); }
          return;
        }
      }
      const status = await bridge("STATUS");
      if (cancelled) return;
      if (!status.ok) {
        setProblem(status.error || "Monitoring extension unavailable");
        setConnecting(false);
        return;
      }
      if (status.connected && status.sessionKey === sessionKey) {
        setConnected(true);
        setStarted(true);
        setConnecting(false);
        return;
      }
      const start = await bridge("START", {
        sessionKey,
        expiresAt: Math.min(
          Date.parse(expiresAt),
          Date.now() + 4 * 60 * 60 * 1000,
        ),
      });
      if (cancelled) return; // A newer mount owns the session; do not stop it.
      setConnecting(false);
      if (!start.ok) {
        setProblem(start.error || "Could not start monitoring");
        return;
      }
      setStarted(true);
      setConnected(true);
      setProblem("");
    };
    void connect();
    return () => {
      cancelled = true;
    };
  }, [active, policy.data?.enabled, classroomId, examId, attemptId, expiresAt, userId, reconnect]);
  useEffect(() => {
    if (!active || !started) return;
    const sessionKey = window.sessionStorage.getItem(
      approvedExamKey(classroomId, examId, userId),
    );
    if (!sessionKey) return;
    const beat = async () => {
      const status = await bridge("STATUS");
      const ready = Boolean(
        status.ok && status.connected && status.sessionKey === sessionKey,
      );
      setConnected(ready);
      try {
        await examMonitor.heartbeat(classroomId, examId, ready);
      } catch (e) {
        setProblem(examError(e));
      }
      await flush();
    };
    void beat();
    const timer = window.setInterval(() => void beat(), 8000);
    return () => window.clearInterval(timer);
  }, [active, started, attemptId, classroomId, examId, flush, userId]);
  useEffect(() => {
    if (!active || !started) return;
    let id: number | undefined;
    const returned = () => {
      if (document.visibilityState !== "visible") return;
      if (id !== undefined) window.clearTimeout(id);
      id = window.setTimeout(() => void flush(), 500);
    };
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", returned);
    document.addEventListener("paste", returned, true);
    return () => {
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", returned);
      document.removeEventListener("paste", returned, true);
      if (id !== undefined) window.clearTimeout(id);
    };
  }, [active, started, flush]);
  // Only monitor while the student is on an active examination screen.
  useEffect(() => {
    if (active) return;
    void (async () => {
      await flush();
      await bridge("STOP");
      setStarted(false);
      setConnected(false);
    })();
  }, [active, flush]);
  useEffect(() => {
    const owner = Symbol("exam-monitor");
    monitorOwner = owner;
    mountedRef.current = true;
    if (delayedStopRef.current !== undefined) {
      window.clearTimeout(delayedStopRef.current);
      delayedStopRef.current = undefined;
    }
    return () => {
      // Actual navigation should stop monitoring, but a StrictMode effect
      // rehearsal/remount must not tear down a real, consented exam session.
      mountedRef.current = false;
      delayedStopRef.current = window.setTimeout(() => {
        if (mountedRef.current || monitorOwner !== owner) return;
        void (async () => {
          const r = await bridge("STATUS");
          if (mountedRef.current || monitorOwner !== owner) return;
          const sessionKey = window.sessionStorage.getItem(
            approvedExamKey(classroomId, examId, userId),
          );
          if (
            r.ok &&
            r.connected &&
            sessionKey &&
            r.sessionKey === sessionKey
          ) {
            await bridge("STOP");
          }
          if (monitorOwner === owner) monitorOwner = null;
        })();
      }, 1200);
    };
  }, [attemptId, classroomId, examId, userId]);
  if (!policy.data?.enabled) return null;
  return (
    <div className="mb-4 rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={17} className="text-primary" /> Exam monitoring
        </span>
        <span
          role="status"
          className={
            connected
              ? "font-medium text-emerald-700 dark:text-emerald-400"
              : "font-medium text-destructive"
          }
        >
          {connected
            ? "Connected"
            : connecting
              ? "Connecting…"
              : started
                ? "Connection lost"
                : "Not connected"}
        </span>
      </div>
      {((!connected && !connecting) || problem) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span role="alert">
            {problem ||
              "Extension session is offline. Reconnect to resume exam monitoring."}
          </span>
          {!connected && (
            <button
              type="button"
              disabled={connecting}
              className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-foreground transition hover:bg-muted"
              onClick={() => setReconnect(n => n + 1)}
            >
              Reconnect monitoring
            </button>
          )}
        </div>
      )}
      {exitNotice && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Exam activity notice"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
            <h4 className="mb-2 flex items-center gap-2 font-bold">
              <ShieldAlert size={20} className="text-destructive" /> Exam activity notice
            </h4>
            <p className="text-sm">
              You left the exam tab. The teacher can review this event.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {exitCount} exit signal(s) recorded. This is not proof of
              cheating.
            </p>
            <button
              type="button"
              autoFocus
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              onClick={() => setExitNotice(false)}
            >
              Continue exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeacherExamMonitoring({
  classroomId,
  examId,
  attemptCount,
}: {
  classroomId: string;
  examId: string;
  attemptCount: number;
}) {
  const policy = useQuery({
    queryKey: ["monitor-policy", classroomId, examId],
    queryFn: () => examMonitor.policy(classroomId, examId),
  });
  const live = useQuery({
    queryKey: ["monitor-live", classroomId, examId],
    queryFn: () => examMonitor.live(classroomId, examId),
    refetchInterval: 8000,
  });
  return (
    <section className="rounded-2xl border border-border bg-secondary p-4 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold">
            <Activity size={17} className="text-primary" /> Browser monitoring
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Required for exam entry. Students must install the extension and
            agree before the exam timer starts.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          Required
        </span>
      </div>
      {policy.isError && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          Monitoring policy unavailable: {examError(policy.error)}
        </p>
      )}
      {policy.data && !policy.data.enabled && (
        <p className="mt-3 text-xs text-destructive">
          Database policy still disabled. Apply the V12 migration.
        </p>
      )}
      {attemptCount > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {attemptCount} attempt(s) recorded.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {live.isPending && (
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        )}
        {live.data?.students.map((student) => (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-card-foreground"
            key={student.attempt_id}
          >
            <span>
              <b>Roll {student.roll || "—"}</b> · {student.student_name}
            </span>
            <span
              className={
                student.extension_connected
                  ? "font-medium text-emerald-700 dark:text-emerald-400"
                  : "font-medium text-destructive"
              }
            >
              {student.extension_connected
                ? "Connected"
                : student.heartbeat_current
                  ? "Extension offline"
                  : "Not connected"}
            </span>
            <span>
              {student.exits} exits · {student.interruptions} gaps
            </span>
            {student.red_flag_events > 0 && (
              <strong className="text-destructive">
                {student.red_flag_events} review flag(s)
              </strong>
            )}
          </div>
        ))}
        {live.data?.students.length === 0 && (
          <p className="text-xs text-muted-foreground">No exam attempts yet.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Updates about every 8 seconds. Search, AI prompt, paste and tab events
        are incomplete review evidence, not proof of cheating.
      </p>
    </section>
  );
}

export function TeacherMonitorEvidence({
  classroomId,
  examId,
  attemptId,
}: {
  classroomId: string;
  examId: string;
  attemptId: string;
}) {
  const report = useQuery({
    queryKey: ["monitor-report", classroomId, examId, attemptId],
    queryFn: () => examMonitor.report(classroomId, examId, attemptId),
    refetchInterval: 12000,
  });
  // A supported AI-site selection-copy with identical text is stronger evidence
  // for human review.
  const matchedSelection = (at: string, text: string) => {
    if (!text.trim()) return null;
    const when = Date.parse(at);
    return (
      (report.data?.events ?? []).find(
        (e) =>
          e.kind === "external_copy" &&
          e.text === text &&
          when - Date.parse(e.recorded_at) >= 0 &&
          when - Date.parse(e.recorded_at) <= 300000,
      )?.domain ?? null
    );
  };
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <h5 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert size={16} className="text-primary" /> Browser monitoring evidence (teacher only)
      </h5>
      {report.isPending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle size={14} className="animate-spin" /> Fetching timeline…
        </p>
      )}
      {report.isError && (
        <p className="text-xs text-destructive">{examError(report.error)}</p>
      )}
      {report.data && (
        <>
          <div className="grid gap-2 text-xs sm:grid-cols-4">
            {[
              ["Exit events", report.data.summary.exits],
              ["Review flags", report.data.summary.red_flag_events],
              ["Sites observed", report.data.summary.external_sites],
              ["Connection gaps", report.data.summary.interruptions],
              ["Searches", report.data.summary.searches],
              ["AI prompts", report.data.summary.ai_prompts],
              ["Exam pastes", report.data.summary.exam_pastes],
              ["Copies observed", report.data.summary.external_copies],
            ].map(([label, value]) => (
              <div className="rounded-lg bg-secondary p-3" key={label}>
                <span className="block text-muted-foreground">{label}</span>
                <b className="text-lg text-foreground">{value}</b>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.data.summary.extension_connected
              ? "Extension connected"
              : "Extension not currently connected"}{" "}
            ·{" "}
            {report.data.summary.consented
              ? "Consent recorded"
              : "No consent/heartbeat recorded"}
          </p>
          {!report.data.summary.consented && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              Website detection unavailable for this attempt: no extension
              consent/heartbeat was recorded. Clipboard paste and tab-hide
              events may still be shown in the separate Exam activity report;
              they do not reveal the source website.
            </p>
          )}
          {report.data.summary.consented &&
            report.data.summary.external_sites === 0 && (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                No external-domain events were received. This may indicate no
                observed visits or incomplete extension coverage; it does not
                prove that no websites were visited.
              </p>
            )}
          {report.data.flags.map((flag) => (
            <p
              key={flag}
              className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200"
            >
              Review: {flag}
            </p>
          ))}
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold">
              Browser activity timeline ({report.data.events.length} events)
            </summary>
            <div className="mt-2 max-h-[30rem] space-y-1 overflow-auto">
              {report.data.events.map((ev, i) => (
                <article
                  className="rounded-lg border border-border bg-background p-3"
                  key={i}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {ev.kind.replaceAll("_", " ")}
                      {ev.domain ? ` · ${ev.domain}` : ""}
                      {ev.duration_seconds ? ` · ~${ev.duration_seconds}s` : ""}
                    </span>
                    <time className="text-muted-foreground">
                      {new Date(ev.recorded_at).toLocaleString()}
                    </time>
                  </div>
                  {ev.kind === "exam_paste" &&
                    matchedSelection(ev.recorded_at, ev.text) && (
                      <p className="mt-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 p-2 text-xs text-emerald-800 dark:text-emerald-200">
                        <strong>Matching selection copy:</strong> identical text
                        was observed copied on{" "}
                        {matchedSelection(ev.recorded_at, ev.text)} before this
                        exam paste. Review context before drawing conclusions.
                      </p>
                    )}
                  {ev.text && (
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-2 font-mono text-xs text-foreground select-text">
                      {ev.text}
                    </pre>
                  )}
                </article>
              ))}
              {!report.data.events.length && (
                <p className="text-muted-foreground">No events reported.</p>
              )}
            </div>
          </details>
          <p className="text-xs text-muted-foreground">{report.data.notice}</p>
        </>
      )}
    </div>
  );
}
