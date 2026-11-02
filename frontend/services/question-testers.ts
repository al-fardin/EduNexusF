import { api } from "@/lib/api";
import { desktopApiOrigin } from "@/lib/desktop-client-bridge";
import type { Workspace } from "@/services/workspace-phase6";

export type TesterAttachment = { id: string; name: string; sha256: string; size: number };
export type TestResult = {
  passed: number; total: number; duration_ms: number;
  cases: Array<{ name: string; status: "passed" | "failed" | "error" | "timeout"; message: string }>;
};
type Envelope<T> = { success: boolean; data: T };
const bridge = "http://127.0.0.1:47913";

export async function uploadQuestionTester(classroomId: string, file: File): Promise<TesterAttachment> {
  const body = new FormData();
  body.append("file", file);
  const response = await api.post<Envelope<TesterAttachment>>(`/classrooms/${classroomId}/exams/testers`, body, { headers: { "Content-Type": undefined } });
  return response.data.data;
}

async function local<T>(path: string, signal: AbortSignal, body?: unknown): Promise<T> {
  const timeout = AbortSignal.timeout(10000);
  let response: Response;
  try {
    response = await fetch(bridge + path, {
      method: body === undefined ? "GET" : "POST", mode: "cors", credentials: "omit", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.any([signal, timeout]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Desktop client unavailable. Open the latest EduNexus Desktop client and connect to this exam.");
  }
  const data = await response.json() as T & { ok?: boolean; error?: string };
  if (!response.ok || !data.ok) throw new Error(data.error || "Desktop test request failed");
  return data;
}

export async function runQuestionTester(
  classroomId: string, examId: string, questionId: string, workspace: Workspace, language: string,
  signal: AbortSignal, onState: (state: string) => void,
): Promise<TestResult> {
  const health = await local<{ tester_protocol?: string }>("/health", signal);
  if (health.tester_protocol !== "edunexus.tester.v1") throw new Error("Update EduNexus Desktop to use question testers.");
  const response = await api.post<Envelope<{ ticket: string }>>(`/classrooms/${classroomId}/exams/${examId}/tester-ticket`, { question_id: questionId }, { signal });
  const job = await local<{ id: string }>("/test-runs", signal, {
    server: desktopApiOrigin(), ticket: response.data.data.ticket, workspace, language,
  });
  try {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      signal.throwIfAborted();
      const status = await local<{ state: string; result?: TestResult; error?: string }>(`/test-runs/${job.id}`, signal);
      onState(status.state);
      if (status.state === "completed" && status.result) return status.result;
      if (status.state === "error") throw new Error(status.error || "Tester failed");
      await new Promise<void>((resolve, reject) => {
        const cancel = () => { window.clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
        const timer = window.setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 700);
        signal.addEventListener("abort", cancel, { once: true });
      });
    }
    throw new Error("Test request expired. Run tests again.");
  } finally {
    // Stops a pending approval or running tester when the exam/editor closes.
    void local(`/test-runs/${job.id}/cancel`, AbortSignal.timeout(3000), {}).catch(() => undefined);
  }
}
