import { api } from "@/lib/api";
export type ClassTopics = {
  items: { id: string; title: string }[];
  links: Record<string, string>;
};
export const topics = {
  async list(classId: string): Promise<ClassTopics> {
    return (await api.get(`/classrooms/${classId}/topics`)).data.data;
  },
  async save(classId: string, title: string, id?: string) {
    return (
      await (id
        ? api.patch(`/classrooms/${classId}/topics/${id}`, { title })
        : api.post(`/classrooms/${classId}/topics`, { title }))
    ).data.data;
  },
  async remove(classId: string, id: string) {
    await api.delete(`/classrooms/${classId}/topics/${id}`);
  },
  async move(
    classId: string,
    kind: "assignment" | "material" | "exam",
    resource: string,
    topic_id: string,
  ) {
    await api.put(
      `/classrooms/${classId}/topics/resources/${kind}/${resource}`,
      { topic_id },
    );
  },
};
