import { api } from "@/lib/api";

export type ClassroomMaterial = {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  file_name: string;
  media_type: string;
  file_size: number;
  created_at: string;
};

type Envelope<T> = { success: boolean; data: T; message?: string };

export const materialService = {
  async list(classroomId: string): Promise<ClassroomMaterial[]> {
    const response = await api.get<Envelope<ClassroomMaterial[]>>(
      `/classrooms/${classroomId}/materials`
    );
    return response.data.data;
  },

  async upload(classroomId: string, data: { title: string; description: string; file: File }): Promise<ClassroomMaterial> {
    const form = new FormData();
    form.append("title", data.title);
    form.append("description", data.description);
    form.append("file", data.file);
    const response = await api.post<Envelope<ClassroomMaterial>>(
      `/classrooms/${classroomId}/materials`, form,
      { headers: { "Content-Type": undefined } }
    );
    return response.data.data;
  },

  async remove(classroomId: string, materialId: string) {
    await api.delete(`/classrooms/${classroomId}/materials/${materialId}`);
  },

  async download(classroomId: string, materialId: string, filename: string) {
    const response = await api.get<Blob>(
      `/classrooms/${classroomId}/materials/${materialId}/download`,
      { responseType: "blob" }
    );
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "material";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
};
