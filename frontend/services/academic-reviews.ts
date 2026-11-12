import { api } from "@/lib/api";
import { cachedResource } from "@/lib/offline-resources";
export type Term = {
  id: string;
  title: string;
  starts_on: string;
  ends_on: string;
  owned: boolean;
};
export type SemesterClass = {
  id: string;
  name: string;
  status: "active" | "archived";
  term_id: string;
  term_title: string;
  syllabus: string;
  role: string;
  owned: boolean;
  subject: string;
  description: string;
};
export type RecheckCandidate = {
  id: string;
  kind: "assignment" | "exam";
  title: string;
};
export type Recheck = {
  id: string;
  student_name: string;
  kind: string;
  resource_id: string;
  title: string;
  grade: {
    score: number;
    maximum: number;
    assignment_id?: string;
    exam_id?: string;
  };
  reason: string;
  status: string;
  version: number;
  created_at: string;
  events: Array<{
    id: number;
    actor: string;
    status: string;
    reason: string;
    at: string;
  }>;
};
export type SimilarityPair = {
  low: string;
  high: string;
  percent: number;
  shared_fragments: number;
  a: { id: string; name: string; version: number; answer: string };
  b: { id: string; name: string; version: number; answer: string };
  review: { note: string; at: string } | null;
};
export type SimilarityResult = {
  pairs: SimilarityPair[];
  matching_pairs: number;
  compared: number;
  insufficient_text: number;
  truncated: boolean;
};
export type QuestionAnalysis = {
  title: string;
  completed_attempts: number;
  questions: Array<{
    id: string;
    kind: string;
    prompt: string;
    topic: string;
    maximum: number;
    attempts: number;
    answered: number;
    unanswered: number;
    correct: number;
    incorrect: number | null;
    graded: number;
    percent: number | null;
    small_sample: boolean;
    options: Array<{
      index: number;
      text: string;
      count: number;
      correct: boolean;
    }>;
  }>;
  topics: Array<{
    topic: string;
    responses: number;
    graded: number;
    percent: number | null;
  }>;
};
export type AccessibleText = {
  image_alt: string;
  caption: string;
  plain_text: string;
  transcript: string;
  captions_vtt: string;
  version: number;
};
export const academicReviews = {
  terms: async (): Promise<Term[]> =>
    (await api.get("/workspace/terms")).data.data,
  saveTerm: async (data: {
    title: string;
    starts_on: string;
    ends_on: string;
  }) => api.post("/workspace/terms", data),
  classes: async (): Promise<SemesterClass[]> =>
    (await api.get("/workspace/semester-classes")).data.data,
  saveClass: async (
    id: string,
    data: { term_id: string; syllabus: string; status: string },
  ) => api.put(`/workspace/semester-classes/${id}`, data),
  contents: async (
    id: string,
  ): Promise<
    Array<{ id: string; kind: string; title: string; status: string }>
  > => (await api.get(`/workspace/semester-classes/${id}/contents`)).data.data,
  rollover: async (
    id: string,
    data: {
      name: string;
      term_id: string;
      request_id: string;
      day_shift: number;
      assignments: boolean;
      exams: boolean;
      materials: boolean;
    },
  ): Promise<{ id: string }> =>
    (await api.post(`/workspace/semester-classes/${id}/rollover`, data)).data
      .data,
  analysis: async (c: string, e: string): Promise<QuestionAnalysis> =>
    (await api.get(`/classrooms/${c}/exams/${e}/question-analysis`)).data.data,
  roster: async (
    c: string,
    a: string,
  ): Promise<
    Array<{
      student_id: string;
      name: string;
      submission_id: string;
      version: number;
    }>
  > =>
    (await api.get(`/classrooms/${c}/assignments/${a}/similarity-roster`)).data
      .data,
  compare: async (
    c: string,
    a: string,
    students: string[],
  ): Promise<SimilarityResult> =>
    (
      await api.post(`/classrooms/${c}/assignments/${a}/similarity`, {
        students,
      })
    ).data.data,
  reviewPair: async (
    c: string,
    a: string,
    pair: SimilarityPair,
    note: string,
  ) =>
    api.post(`/classrooms/${c}/assignments/${a}/similarity-review`, {
      low: pair.low,
      high: pair.high,
      note,
    }),
  rechecks: async (
    c: string,
    state: string,
    offset: number,
  ): Promise<{ items: Recheck[]; next_offset: number; scope: string }> =>
    (await api.get(`/classrooms/${c}/rechecks`, { params: { state, offset } }))
      .data.data,
  eligible: async (c: string): Promise<RecheckCandidate[]> =>
    (await api.get(`/classrooms/${c}/rechecks/eligible`)).data.data,
  request: async (
    c: string,
    data: { kind: string; resource_id: string; reason: string },
  ): Promise<{ id: string; existing?: boolean }> =>
    (await api.post(`/classrooms/${c}/rechecks`, data)).data.data,
  respond: async (
    c: string,
    id: string,
    data: { status: string; reason: string; version: number },
  ) => api.post(`/classrooms/${c}/rechecks/${id}/respond`, data),
  accessible: async (c: string, id: string): Promise<AccessibleText> =>
    cachedResource(
      c,
      "accessible-material-" + id,
      async () =>
        (await api.get(`/classrooms/${c}/materials/${id}/accessibility`)).data
          .data,
    ),
  saveAccessible: async (c: string, id: string, data: AccessibleText) =>
    api.put(`/classrooms/${c}/materials/${id}/accessibility`, data),
};
