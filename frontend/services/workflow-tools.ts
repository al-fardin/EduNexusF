import { api } from "@/lib/api";
export type TimingResource = {
  id: string;
  kind: "exam" | "assignment";
  title: string;
};
export type PersonalTiming = {
  resource_id: string;
  kind: "exam" | "assignment";
  student_id: string;
  name: string;
  roll: string;
  extra_minutes: number;
  due_at: string | null;
  version: number;
};
export type TrashItem = {
  id: string;
  title: string;
  kind: "class" | "material" | "post";
  deleted_at: string;
};
export const workflowTools = {
  async timing(
    classId: string,
    offset = 0,
  ): Promise<{
    resources: TimingResource[];
    items: PersonalTiming[];
    next_offset: number;
  }> {
    return (
      await api.get(`/classrooms/${classId}/accommodations`, {
        params: { offset },
      })
    ).data.data;
  },
  async saveTiming(
    classId: string,
    value: {
      resource_id: string;
      kind: string;
      student_roll: string;
      extra_minutes: number;
      due_at: string | null;
      version: number;
      reason: string;
    },
  ) {
    await api.put(`/classrooms/${classId}/accommodations`, value);
  },
  async trash(
    classId = "",
    offset = 0,
  ): Promise<{ items: TrashItem[]; next_offset: number }> {
    return (
      await api.get(
        classId ? `/classrooms/${classId}/trash` : "/workspace/trash",
        { params: { offset } },
      )
    ).data.data;
  },
  async restore(item: TrashItem, reason: string, classId = "") {
    await api.post(
      item.kind === "class"
        ? `/workspace/trash/${item.id}/restore`
        : `/classrooms/${classId}/trash/${item.kind}/${item.id}/restore`,
      { deleted_at: item.deleted_at, reason },
    );
  },
};
