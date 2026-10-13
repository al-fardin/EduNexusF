import { api } from "@/lib/api";
import type { ExamInfo, ExamQuestion, NewExam } from "@/services/exams";

type Envelope<T> = { success: boolean; data: T };
const base = (classroom: string) => `/classrooms/${classroom}/exams`;
export type StudentGrade = {
  id: string;
  student_name: string;
  status: string;
  eligible: boolean;
  ready: boolean;
  published: boolean;
  total: number;
  answers: Record<string,string>;
  marks: { question_id: string; points: number; feedback: string; grader: string }[];
};
export type GradeSheet = { exam: ExamInfo; questions: ExamQuestion[]; attempts: StudentGrade[]; max_points: number };
export type PublicMark = { exam_id: string; exam_title: string; attempt_id: string; student_name: string; student_roll: string; total: number; max_points: number; published_at: string };
export type PrivateResult = { total: number; maximum: number; questions: { question_id: string; prompt: string; kind: string; awarded: number; maximum: number; feedback: string; answer: string }[] };
export const examManagement = {
  async edit(classroom: string, id: string, payload: NewExam) {
    await api.put(`${base(classroom)}/${id}/manage`, payload);
  },
  async close(classroom: string, id: string) {
    await api.post(`${base(classroom)}/${id}/close`);
  },
  async grades(classroom: string, id: string): Promise<GradeSheet> {
    const res = await api.get<Envelope<GradeSheet>>(`${base(classroom)}/${id}/grades`);
    return res.data.data;
  },
  async mark(classroom: string, id: string, attemptId: string, questionId: string, points: number, feedback: string) {
    await api.put(`${base(classroom)}/${id}/grades/${attemptId}`, { question_id: questionId, points, feedback });
  },
  async publishResults(classroom: string, id: string, attemptIds: string[]) {
    const res = await api.post<Envelope<{processed:number;skipped:string[]}>>(`${base(classroom)}/${id}/results/publish`, {attempt_ids:attemptIds});
    return res.data.data;
  },
  async retract(classroom: string, id: string, attemptIds: string[]) {
    await api.post(`${base(classroom)}/${id}/results/retract`, {attempt_ids:attemptIds});
  },
  async publicResults(classroom: string): Promise<PublicMark[]> {
    const res = await api.get<Envelope<PublicMark[]>>(`${base(classroom)}/results/public`);
    return res.data.data;
  },
  async myResult(classroom: string, id: string): Promise<PrivateResult> {
    const res = await api.get<Envelope<PrivateResult>>(`${base(classroom)}/${id}/results/me`);
    return res.data.data;
  },
  async downloadPDF(classroom: string, id: string) {
    const response = await api.get(`${base(classroom)}/${id}/results/marksheet.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a"); link.href = url; link.download = "edunexus-result.pdf"; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
