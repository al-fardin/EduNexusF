import { api } from "@/lib/api";

type Envelope<T> = { success: boolean; data: T; message?: string };
export type QuestionKind = "mcq" | "theory" | "coding";
export type ExamQuestion = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  points: number;
  options?: string[];
  correct_option?: number;
  sample_answer?: string;
  language?: string;
};
export type ExamInfo = {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: "draft" | "published";
  question_count: number;
  created_at: string;
};
export type ExamAttempt = {
  id: string;
  started_at: string;
  expires_at: string;
  status: "in_progress" | "submitted";
  answers: Record<string, string>;
  submitted_at: string | null;
};
export type LiveExam = {
  exam: ExamInfo;
  questions: ExamQuestion[];
  attempt: ExamAttempt;
  server_time: string;
};
export type ExamSubmission = {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  status: "in_progress" | "submitted" | "expired";
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  answers: Record<string, string>;
};
export type NewExam = {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  questions: ExamQuestion[];
};
const prefix = (classroomId: string) => `/classrooms/${classroomId}/exams`;
export const examService = {
  async list(classroomId: string): Promise<ExamInfo[]> {
    const r = await api.get<Envelope<ExamInfo[]>>(prefix(classroomId));
    return r.data.data;
  },
  async create(classroomId: string, payload: NewExam): Promise<{ id: string; status: string }> {
    const r = await api.post<Envelope<{ id: string; status: string }>>(prefix(classroomId), payload);
    return r.data.data;
  },
  async publish(classroomId: string, id: string) {
    await api.post(`${prefix(classroomId)}/${id}/publish`);
  },
  async teacherExam(classroomId: string, id: string): Promise<{ exam: ExamInfo; questions: ExamQuestion[] }> {
    const r = await api.get<Envelope<{ exam: ExamInfo; questions: ExamQuestion[] }>>(`${prefix(classroomId)}/${id}`);
    return r.data.data;
  },
  async submissions(classroomId: string, id: string): Promise<ExamSubmission[]> {
    const r = await api.get<Envelope<ExamSubmission[]>>(`${prefix(classroomId)}/${id}/submissions`);
    return r.data.data;
  },
  async start(classroomId: string, id: string): Promise<LiveExam> {
    const r = await api.post<Envelope<LiveExam>>(`${prefix(classroomId)}/${id}/start`);
    return r.data.data;
  },
  async attempt(classroomId: string, id: string): Promise<LiveExam> {
    const r = await api.get<Envelope<LiveExam>>(`${prefix(classroomId)}/${id}/attempt`);
    return r.data.data;
  },
  async save(classroomId: string, id: string, answers: Record<string,string>): Promise<ExamAttempt> {
    const r = await api.put<Envelope<ExamAttempt>>(`${prefix(classroomId)}/${id}/attempt`, {answers});
    return r.data.data;
  },
  async submit(classroomId: string, id: string, answers: Record<string,string>): Promise<ExamAttempt> {
    const r = await api.post<Envelope<ExamAttempt>>(`${prefix(classroomId)}/${id}/submit`, {answers});
    return r.data.data;
  },
};
export function examError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : "Exam request failed. Please retry.";
}
