import { api } from "@/lib/api";
import type { WorkspaceEvent } from "./workspace";
export type CalendarItem = Omit<WorkspaceEvent, "kind"> & {
  kind: "exam" | "assignment" | "event";
  ends_at: string;
  description: string;
  lead_minutes: number;
  reminder_sent: boolean;
  version: number;
};
export type SearchItem = {
  id: string;
  kind: string;
  title: string;
  excerpt: string;
  classroom_id: string;
  classroom_name: string;
  role: string;
  at: string;
};
export type StudentProgress = {
  id: string;
  name: string;
  roll: string;
  percent: number | null;
  graded: number;
  missing: number;
  present: number;
  attendance_total: number;
  excused: number;
  trend: Array<{
    id: string;
    kind: string;
    title: string;
    at: string;
    score: number;
    maximum: number;
  }>;
};
export type AttendanceRow = {
  id: string;
  name: string;
  roll: string;
  status: string;
};
export type GradePreview = {
  rows: Array<{
    submission_id: string;
    student: string;
    version: number;
    points: number;
    previous: number | null;
    feedback: string;
  }>;
  revision: string;
  maximum: number;
};
export const academic = {
  template: async (classId: string, assignment: string) =>
    (
      await api.get<Blob>(
        `/classrooms/${classId}/assignments/${assignment}/import-template`,
        { responseType: "blob" },
      )
    ).data,
  calendar: async (
    from: string,
    to: string,
  ): Promise<{ items: CalendarItem[]; truncated: boolean }> =>
    (await api.get("/workspace/calendar", { params: { from, to } })).data.data,
  search: async (
    q: string,
    kind: string,
    offset: number,
  ): Promise<{ items: SearchItem[]; next_offset: number }> =>
    (await api.get("/workspace/search", { params: { q, kind, offset } })).data
      .data,
  createEvent: async (
    classId: string,
    data: {
      title: string;
      description: string;
      starts_at: string;
      ends_at: string;
    },
  ) =>
    (await api.post(`/classrooms/${classId}/calendar/events`, data)).data.data,
  deleteEvent: async (item: CalendarItem) =>
    api.delete(`/classrooms/${item.classroom_id}/calendar/events/${item.id}`),
  reminder: async (item: CalendarItem, lead: number) =>
    lead
      ? api.put(
          `/classrooms/${item.classroom_id}/calendar/${item.kind}/${item.id}/reminder`,
          { lead_minutes: lead },
        )
      : api.delete(
          `/classrooms/${item.classroom_id}/calendar/${item.kind}/${item.id}/reminder`,
        ),
  progress: async (
    classId: string,
    student?: string,
  ): Promise<{ scope: string; students: StudentProgress[] }> =>
    (await api.get(`/classrooms/${classId}/progress`, { params: { student } }))
      .data.data,
  attendance: async (classId: string, day: string): Promise<AttendanceRow[]> =>
    (await api.get(`/classrooms/${classId}/attendance`, { params: { day } }))
      .data.data,
  saveAttendance: async (
    classId: string,
    day: string,
    rows: Array<{ id: string; status: string }>,
  ) =>
    api.put(`/classrooms/${classId}/attendance`, { rows }, { params: { day } }),
  importGrades: async (
    classId: string,
    assignment: string,
    data: {
      csv: string;
      confirm?: boolean;
      request_id?: string;
      revision?: string;
      reason?: string;
    },
  ): Promise<GradePreview> =>
    (
      await api.post(
        `/classrooms/${classId}/assignments/${assignment}/import-grades`,
        data,
      )
    ).data.data,
  bundle: async (classId: string, assignment: string) =>
    (
      await api.get<Blob>(
        `/classrooms/${classId}/assignments/${assignment}/submission-bundle`,
        { responseType: "blob" },
      )
    ).data,
  remind: async (classId: string, assignment: string, students: string[]) =>
    api.post(`/classrooms/${classId}/assignments/${assignment}/remind`, {
      students,
    }),
};
