import { api } from "@/lib/api";
import type { Classroom } from "@/services/classroom";
export type WorkspaceClass = Classroom & {
  role: "teacher" | "student";
  teacher_name: string;
  teacher_avatar: string;
};
export type WorkspaceEvent = {
  id: string;
  kind: "exam" | "assignment";
  title: string;
  at: string;
  classroom_id: string;
  classroom_name: string;
  role: string;
};
export type WorkspaceActivity = {
  id: string;
  title: string;
  classroom_id: string;
  classroom_name: string;
  author_name: string;
  kind: string;
  at: string;
  role: string;
};
export type WorkspaceData = {
  classes: WorkspaceClass[];
  upcoming: WorkspaceEvent[];
  activity: WorkspaceActivity[];
};
export type WorkspaceFile = {
  id: string;
  classroom_id: string;
  classroom_name: string;
  title: string;
  file_name: string;
  media_type: string;
  file_size: number;
  created_at: string;
  role: string;
};
export const classPath = (id: string, role: string) =>
  `/${role === "teacher" ? "instructor" : "student"}/classrooms/${id}`;
export const workspace = {
  async overview(from?: string, to?: string): Promise<WorkspaceData> {
    return (
      await api.get("/workspace", {
        params: from && to ? { from, to } : undefined,
      })
    ).data.data;
  },
  async files(): Promise<WorkspaceFile[]> {
    return (await api.get("/workspace/files")).data.data;
  },
};
