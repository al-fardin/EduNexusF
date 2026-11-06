import type {AxiosProgressEvent} from "axios";
import { api } from "@/lib/api";
import {cachedResource,materialBlob} from "@/lib/offline-resources";

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
    return cachedResource(classroomId,"materials",async()=>{
    const response = await api.get<Envelope<ClassroomMaterial[]>>(
      `/classrooms/${classroomId}/materials`
    );
    return response.data.data;});
  },

  async upload(classroomId: string, data: { title: string; description: string; file: File },options?:{signal?:AbortSignal;onUploadProgress?:(e:AxiosProgressEvent)=>void}): Promise<ClassroomMaterial> {
    const form = new FormData();
    form.append("title", data.title);
    form.append("description", data.description);
    form.append("file", data.file);
    const response = await api.post<Envelope<ClassroomMaterial>>(
      `/classrooms/${classroomId}/materials`, form,
      { headers: { "Content-Type": undefined },...options }
    );
    return response.data.data;
  },

  async remove(classroomId: string, materialId: string, reason="") {
    await api.delete(`/classrooms/${classroomId}/materials/${materialId}`,{data:{reason}});
  },

  async download(classroomId: string, materialId: string, filename: string) {
    const blob=await materialBlob(`/classrooms/${classroomId}/materials/${materialId}/download`,undefined,filename);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "material";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
};
