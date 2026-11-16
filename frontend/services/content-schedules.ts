import { api } from "@/lib/api";
export type ContentSchedule = {
  id: string;
  kind: "material" | "assignment";
  title: string;
  publish_at: string;
  state: string;
  version: number;
  error: string;
};
export const contentSchedules = {
  async list(
    classId: string,
    offset = 0,
  ): Promise<{ items: ContentSchedule[]; next_offset: number }> {
    return (
      await api.get(`/classrooms/${classId}/content-schedules`, {
        params: { offset },
      })
    ).data.data;
  },
  async update(
    classId: string,
    item: ContentSchedule,
    action: "cancel" | "publish" | "reschedule",
    publish_at?: string,
  ) {
    await api.put(`/classrooms/${classId}/content-schedules`, {
      id: item.id,
      kind: item.kind,
      version: item.version,
      action,
      publish_at,
    });
  },
};
