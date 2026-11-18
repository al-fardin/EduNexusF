import { api } from "@/lib/api";
import type { ExamQuestion } from "@/services/exams";
export type BankItem = {
  id: string;
  question: ExamQuestion;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  version: number;
  updated_at: string;
};
export type BankInput = {
  question: ExamQuestion;
  topic: string;
  difficulty: string;
  version?: number;
};
export type BankFilters = {
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  q?: string;
};
export const questionBank = {
  async page(
    classId: string,
    filters: BankFilters = {},
    offset = 0,
  ): Promise<{ items: BankItem[]; next_offset: number }> {
    return (
      await api.get(`/classrooms/${classId}/question-bank/page`, {
        params: { ...filters, offset },
      })
    ).data.data;
  },
  async taxonomy(
    classId: string,
  ): Promise<
    { subject: string; chapter: string; topic: string; count: number }[]
  > {
    return (await api.get(`/classrooms/${classId}/question-bank/taxonomy`)).data
      .data;
  },
  async usage(
    classId: string,
    id: string,
  ): Promise<{
    items: { id: string; title: string; status: string; match: string }[];
    truncated: boolean;
  }> {
    return (await api.get(`/classrooms/${classId}/question-bank/${id}/usage`))
      .data.data;
  },
  async duplicates(
    classId: string,
    prompts: string[],
    signal?: AbortSignal,
  ): Promise<{ id: string; prompt: string }[]> {
    return (
      await api.post(
        `/classrooms/${classId}/question-bank/duplicates`,
        { prompts },
        { signal },
      )
    ).data.data;
  },
  async list(
    classId: string,
    topic = "",
    difficulty = "",
  ): Promise<BankItem[]> {
    return (
      await api.get(`/classrooms/${classId}/question-bank`, {
        params: { topic, difficulty },
      })
    ).data.data;
  },
  async save(classId: string, items: BankInput | BankInput[], id?: string) {
    return (
      await api[id ? "put" : "post"](
        `/classrooms/${classId}/question-bank${id ? `/${id}` : ""}`,
        items,
      )
    ).data.data;
  },
  async remove(classId: string, id: string) {
    await api.delete(`/classrooms/${classId}/question-bank/${id}`);
  },
  async draw(
    classId: string,
    count: number,
    topic: string,
    difficulty: string,
    filters: BankFilters = {},
  ): Promise<BankItem[]> {
    return (
      await api.post(
        `/classrooms/${classId}/question-bank/draw`,
        {},
        { params: { ...filters, count, topic, difficulty } },
      )
    ).data.data;
  },
};
