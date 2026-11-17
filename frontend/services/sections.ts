import { api } from "@/lib/api";
export type Section = {
  id: string;
  name: string;
  version: number;
  students: number;
};
export type RosterStudent = {
  id: string;
  name: string;
  email: string;
  roll: string;
  section_id: string;
  version: number;
};
export type RosterPreview = {
  rows: Array<{
    line: number;
    name: string;
    email: string;
    roll: string;
    section: string;
    state: string;
  }>;
  ready: number;
  revision: string;
  changed: number;
};
export type StudentView = {
  student: { name: string; roll: string; section: string };
  items: Array<{
    id: string;
    kind: string;
    title: string;
    visible: boolean;
    reason: string;
  }>;
  next_offset: number;
};
export const sections = {
  async bulk(
    id: string,
    students: RosterStudent[],
    section_id: string,
    reason: string,
  ) {
    await api.post(`/classrooms/${id}/roster/bulk-section`, {
      students: students.map((s) => ({ id: s.id, version: s.version })),
      section_id,
      reason,
    });
  },
  async list(id: string): Promise<Section[]> {
    return (await api.get(`/classrooms/${id}/sections`)).data.data;
  },
  async create(id: string, name: string) {
    return (await api.post(`/classrooms/${id}/sections`, { name })).data.data;
  },
  async rename(id: string, item: Section, name: string) {
    await api.patch(`/classrooms/${id}/sections/${item.id}`, {
      name,
      version: item.version,
    });
  },
  async remove(id: string, item: Section) {
    await api.delete(`/classrooms/${id}/sections/${item.id}`, {
      data: { version: item.version },
    });
  },
  async roster(
    id: string,
    q = "",
    offset = 0,
  ): Promise<{ items: RosterStudent[]; next_offset: number }> {
    return (
      await api.get(`/classrooms/${id}/roster`, { params: { q, offset } })
    ).data.data;
  },
  async assign(
    id: string,
    item: RosterStudent,
    section_id: string,
    reason: string,
  ) {
    await api.put(`/classrooms/${id}/roster/${item.id}`, {
      section_id,
      reason,
      version: item.version,
    });
  },
  async import(
    id: string,
    csv: string,
    action: "preview" | "commit",
    revision = "",
    reason = "",
  ): Promise<RosterPreview> {
    return (
      await api.post(`/classrooms/${id}/roster/import`, {
        csv,
        action,
        revision,
        reason,
      })
    ).data.data;
  },
  async studentView(
    id: string,
    roll: string,
    offset = 0,
  ): Promise<StudentView> {
    return (
      await api.get(`/classrooms/${id}/student-view`, {
        params: { roll, offset },
      })
    ).data.data;
  },
};
