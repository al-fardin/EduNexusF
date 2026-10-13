import { api } from "@/lib/api";

type Envelope<T> = { success: boolean; data: T; message?: string };
export type CodeRunResult = { status: "ok" | "error" | "timeout"; stdout: string; stderr: string; duration_ms: number; truncated: boolean };
export type ActivityKind = "paste" | "editor_edit" | "visibility_hidden" | "visibility_visible";
export type ActivityEvent = { kind: ActivityKind; question_id: string; magnitude: number };
export type ActivityReport = {
  summary: { pastes: number; large_pastes: number; tab_hides: number; edit_batches: number; code_runs: number; failed_runs: number };
  flags: string[];
  events: Array<{ kind: string; question_id?: string | null; magnitude: number; recorded_at: string }>;
  notice: string;
};
const path = (classId: string, examId: string) => `/classrooms/${classId}/exams/${examId}`;
export const codingService = {
  async run(classId: string, examId: string, question_id: string, code: string, stdin: string): Promise<CodeRunResult> {
    const r = await api.post<Envelope<CodeRunResult>>(`${path(classId, examId)}/run`, { question_id, code, stdin });
    return r.data.data;
  },
  async activity(classId: string, examId: string, events: ActivityEvent[]): Promise<void> {
    await api.post(`${path(classId, examId)}/activity`, { events });
  },
  async report(classId: string, examId: string, attemptId: string): Promise<ActivityReport> {
    const r = await api.get<Envelope<ActivityReport>>(`${path(classId, examId)}/activity/${attemptId}`);
    return r.data.data;
  },
};
