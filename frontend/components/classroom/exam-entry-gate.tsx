"use client";
import { useAuthStore } from "@/store/auth-store";
import { clientId } from "@/lib/client-id";
import { MobileExamEntry } from "@/components/classroom/mobile-exam-entry";
import { useMobileDevice } from "@/lib/mobile-device";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  MonitorCheck,
} from "lucide-react";
import { examMonitor } from "@/services/exam-monitor";
import { examError, examService } from "@/services/exams";
import { monitorBridge, approvedExamKey } from "@/lib/exam-monitor-bridge";
import {
  detectExamBrowser,
  extensionAddress,
  type ExamBrowser,
  type SupportedExamBrowser,
} from "@/lib/exam-browser-support";

import Image from "next/image";
const subscribeDevice = () => () => {};
const serverDevice = () => "unsupported" as const;
function readBrowser() {
  return detectExamBrowser(navigator.userAgent);
}
type Detection = "checking" | "missing" | "ready";
type GuideStep = { src: string; alt: string; heading: string; text: string };
const setupGuide = (browser: SupportedExamBrowser): GuideStep[] => {
  const edge = browser === "edge";
  return [
    {
      src: "/exam-monitor-guide/01-download.svg",
      alt: "Extract the EduNexus Exam Monitor ZIP",
      heading: "Download & extract",
      text: "Download the ZIP, extract it, and keep the folder. Windows: Extract All. Linux: Extract Here.",
    },
    {
      src: edge
        ? "/exam-monitor-guide/edge-02-extensions.svg"
        : "/exam-monitor-guide/02-extensions.svg",
      alt: `${edge ? "Edge" : "Chrome"} extensions page showing Developer mode`,
      heading: "Enable Developer mode",
      text: `Paste ${extensionAddress(browser)} in your address bar, then enable Developer mode.`,
    },
    {
      src: edge
        ? "/exam-monitor-guide/edge-03-load.svg"
        : "/exam-monitor-guide/03-load.svg",
      alt: `${edge ? "Edge" : "Chrome"} Load unpacked extension button`,
      heading: "Load unpacked",
      text: "Choose Load unpacked and select the extracted EduNexus-Exam-Monitor folder (containing manifest.json).",
    },
    {
      src: edge
        ? "/exam-monitor-guide/edge-04-verify.svg"
        : "/exam-monitor-guide/04-verify.svg",
      alt: `${edge ? "Edge" : "Chrome"} extension enabled with site access for this website`,
      heading: "Verify & return",
      text: "Open the extension icon and choose Connect this EduNexus site, then return here. Localhost connects automatically.",
    },
  ];
};

function BrowserExamEntryGate({
  classroomId,
  examId,
  onEnter,
  onExit,
}: {
  classroomId: string;
  examId: string;
  onEnter: () => void;
  onExit: () => void;
}) {
  const policy = useQuery({
    queryKey: ["monitor-policy", classroomId, examId],
    queryFn: () => examMonitor.policy(classroomId, examId),
    retry: 1,
  });
  const exams = useQuery({
    queryKey: ["classrooms", classroomId, "exams"],
    queryFn: () => examService.list(classroomId),
    staleTime: 30000,
  });
  const userId = useAuthStore(s => s.user?.id ?? "");
  const resumed = useRef(false);
  const admission = useQuery({
    queryKey: ["monitor-admission", classroomId, examId, userId],
    queryFn: () => examMonitor.admission(classroomId, examId),
    retry: 1,
    staleTime: 0,
  });
  const [detected, setDetected] = useState<Detection>("checking");
  const detectedBrowser = useSyncExternalStore(
    subscribeDevice,
    readBrowser,
    serverDevice,
  );
  const [braveBrowser, setBraveBrowser] = useState(false);
  const browser: ExamBrowser = braveBrowser ? "unsupported" : detectedBrowser;
  const [guideChoice, setGuideBrowser] = useState<SupportedExamBrowser | null>(
    null,
  );
  const guideBrowser = guideChoice ?? (browser === "edge" ? "edge" : "chrome");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(false);
  useEffect(() => {
    if (!admission.data?.admitted || detected !== "ready" || resumed.current) return;
    resumed.current = true;
    onEnter();
  });


  useEffect(() => {
    let mounted = true;
    const which = detectExamBrowser(window.navigator.userAgent);
    // Brave can masquerade as Chrome in its UA. Do not label it supported.
    const brave = window.navigator as Navigator & {
      brave?: { isBrave?: () => Promise<boolean> };
    };
    void (async () => {
      try {
        if (await brave.brave?.isBrave?.()) {
          if (mounted) {
            setBraveBrowser(true);
            setDetected("missing");
          }
          return;
        }
      } catch {}
      if (which === "unsupported") {
        if (mounted) setDetected("missing");
        return;
      }
      const r = await monitorBridge("STATUS");
      if (mounted) setDetected(r.ok ? "ready" : "missing");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let busy = false;
    let disposed = false;
    const recheck = async () => {
      if (busy || document.visibilityState !== "visible" || browser === "unsupported") return;
      busy = true;
      const status = await monitorBridge("STATUS");
      busy = false;
      if (!disposed) setDetected(status.ok ? "ready" : "missing");
    };
    window.addEventListener("focus", recheck);
    const timer = window.setInterval(() => { if (detected !== "ready") void recheck(); }, 3500);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("focus", recheck); };
  }, [browser, detected]);

  async function verify() {
    if (browser === "unsupported") {
      setError(
        "Use desktop Google Chrome or Microsoft Edge to take this exam.",
      );
      return;
    }
    setChecking(true);
    setError("");
    const result = await monitorBridge("STATUS");
    setDetected(result.ok ? "ready" : "missing");
    if (!result.ok)
      setError(
        result.error ||
          "Extension unavailable. Reload it and allow site access for this website:3000.",
      );
    setChecking(false);
  }

  async function agreeAndEnter() {
    if (
      browser === "unsupported" ||
      detected !== "ready" ||
      joining ||
      !policy.data?.enabled
    )
      return;
    setJoining(true);
    setError("");
    try {
      // Recheck on the actual click; consent is not accepted with a stale status.
      const check = await monitorBridge("STATUS");
      if (!check.ok) {
        setDetected("missing");
        throw new Error("Extension disconnected. Recheck the connection.");
      }
      const sessionKey = `exam-${examId}-${userId}-${clientId()}`;
      const examEnd = exams.data?.find((exam) => exam.id === examId)?.ends_at;
      const endMs = examEnd ? Date.parse(examEnd) : NaN;
      if (!Number.isFinite(endMs) || endMs <= Date.now())
        throw new Error(
          "Exam window closed or cannot be verified. Return to exams.",
        );
      const expiresAt = Math.min(endMs, Date.now() + 4 * 60 * 60 * 1000);
      const start = await monitorBridge("START", { sessionKey, expiresAt });
      if (!start.ok || !start.connected)
        throw new Error(start.error || "Cannot start browser monitoring");
      try {
        await examMonitor.admit(classroomId, examId, true);
        window.sessionStorage.setItem(
          approvedExamKey(classroomId, examId, userId),
          sessionKey,
        );
        onEnter();
      } catch (e) {
        await monitorBridge("STOP");
        throw e;
      }
    } catch (e) {
      setError(examError(e));
      setJoining(false);
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-5xl space-y-6 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8"
      aria-labelledby="monitor-gate-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-secondary p-3 text-primary">
            <ShieldCheck size={24} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
              EduNexus · Secure exams
            </p>
            <h2 id="monitor-gate-title" className="mt-1 text-2xl font-bold text-foreground">
              Before you begin
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up browser monitoring and review consent before entering the exam.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          disabled={joining}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          <ArrowLeft size={16} /> Back to exams
        </button>
      </header>
      {policy.isPending && (
        <div
          role="status"
          className="animate-pulse rounded-xl bg-secondary p-5 text-sm text-muted-foreground"
        >
          Checking exam requirements…
        </div>
      )}
      {admission.isError && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm"><p>Unable to check your exam session.</p><button type="button" className="mt-2 font-semibold text-primary" onClick={()=>void admission.refetch()}>Retry connection</button></div>}
      {policy.isError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Cannot check exam monitoring settings: {examError(policy.error)}.
          Please retry.
        </p>
      )}
      {policy.data && !policy.data.enabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          This exam is not configured for required monitoring. Ask your teacher
          to enable it before joining.
        </div>
      )}
      {policy.data?.enabled && (
        <>
          {browser === "unsupported" && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-900 dark:text-amber-200"
            >
              <strong>Chrome or Microsoft Edge required.</strong> Open this exam
              in a desktop Chrome/Edge browser. Mobile, Firefox, Safari and
              untested Chromium variants are not supported.
            </div>
          )}
          {detected === "missing" || detected === "checking" ? (
            <section className="space-y-5" aria-label="Extension setup">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary p-4">
                <div>
                  <h3 className="font-bold text-foreground">One-time extension setup</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Chrome and Edge on Windows and Linux. No desktop app required.
                  </p>
                </div>
                <a
                  href="/downloads/EduNexus-Exam-Monitor.zip"
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Download size={17} /> Download extension
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2" aria-label="Setup guide browser">
                  {(["chrome", "edge"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        setGuideBrowser(choice);
                        setCopied(false);
                      }}
                      aria-pressed={guideBrowser === choice}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        guideBrowser === choice
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {choice === "chrome" ? "Google Chrome" : "Microsoft Edge"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(extensionAddress(guideBrowser))
                      .then(() => setCopied(true))
                      .catch(() =>
                        setError(
                          "Copy unavailable. Manually enter the address shown below.",
                        ),
                      )
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {copied ? "Copied!" : "Copy extensions address"}
                </button>
              </div>
              <p className="rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm font-semibold text-foreground">
                {extensionAddress(guideBrowser)}{" "}
                <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                  paste into the browser address bar
                </span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {setupGuide(guideBrowser).map((step, i) => (
                  <article
                    key={step.src}
                    className="overflow-hidden rounded-2xl border border-border bg-background"
                  >
                    {/* SVG illustrations are labeled steps, not exact browser screenshots. */}
                    <div className="border-b border-border bg-white">
                      <Image
                        src={step.src}
                        alt={step.alt}
                        width={800}
                        height={500}
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-bold uppercase tracking-wide text-primary">
                        Step {i + 1}
                      </span>
                      <h4 className="mt-1 font-semibold text-foreground">{step.heading}</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Chrome/Edge requires manual installation for an unpacked
                extension; a website cannot install it automatically. Use the
                same browser profile for the exam.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void verify()}
                  disabled={
                    checking ||
                    detected === "checking" ||
                    browser === "unsupported"
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={checking ? "animate-spin" : ""}
                  />
                  {checking ? "Checking…" : "Check extension connection"}
                </button>
                <span className="text-sm text-muted-foreground">
                  {detected === "checking"
                    ? "Checking browser…"
                    : browser === "unsupported"
                      ? "Unsupported browser"
                      : "Extension not detected yet"}
                </span>
              </div>
            </section>
          ) : (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <MonitorCheck className="text-emerald-600 dark:text-emerald-400" size={24} />
                <div>
                  <p className="font-semibold text-foreground">Extension ready</p>
                  <p className="text-xs text-muted-foreground">
                    You are ready to review exam monitoring consent.
                  </p>
                </div>
              </div>
              <button
                className="text-xs font-semibold text-primary underline"
                type="button"
                onClick={() => void verify()}
              >
                Recheck
              </button>
            </section>
          )}
          <section className="space-y-4 rounded-2xl border border-border bg-background p-5">
            <h3 className="text-lg font-bold text-foreground">Exam monitoring consent</h3>
            <p className="text-sm font-medium text-foreground">
              During this exam, your teacher may review browser visits,
              searches, AI prompts, and exam copy/paste events. Do you agree?
            </p>
            <button
              type="button"
              onClick={() => setDetails((x) => !x)}
              className="text-xs font-medium text-primary underline"
            >
              {details ? "Hide" : "What is monitored?"}
            </button>
            {details && (
              <p className="rounded-xl border border-border bg-secondary p-3 text-xs leading-5 text-muted-foreground">
                Only during your exam: active domains, search terms, newly
                submitted prompts on supported AI websites, selected text copied
                there, text pasted in your exam, tab changes and connection
                gaps. Past chats, unrelated page content, and passwords are not
                collected. Signals are evidence for review, not proof of
                cheating.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void agreeAndEnter()}
                disabled={
                  browser === "unsupported" ||
                  detected !== "ready" ||
                  joining ||
                  !policy.data?.enabled ||
                  admission.isPending || admission.isError ||
                  exams.isPending ||
                  exams.isError
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-45"
              >
                <CheckCircle2 size={18} />
                {joining ? "Entering…" : admission.data?.admitted ? "Resume exam" : "Agree & enter exam"}
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.removeItem(
                    approvedExamKey(classroomId, examId, userId),
                  );
                  onExit();
                }}
                disabled={joining}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                <ShieldX size={17} /> Decline & leave
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Consent is saved for this attempt. Returning to an active exam does not require agreement again.
            </p>
          </section>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  );
}

export function ExamEntryGate(props: {
  classroomId: string;
  examId: string;
  onEnter: () => void;
  onExit: () => void;
}) {
  return useMobileDevice() ? (
    <MobileExamEntry {...props} />
  ) : (
    <BrowserExamEntryGate {...props} />
  );
}
