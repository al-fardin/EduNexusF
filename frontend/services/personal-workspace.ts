import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/academic-tools";
export type PersonalContext = {
  context_class: string;
  context_kind: string;
  context_id: string;
};
export type PersonalItem = PersonalContext & {
  id: string;
  title: string;
  body: string;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  links: Array<{ label: string; url: string }>;
  version: number;
  context_url?: string;
  context_excerpt?: string;
};
export type PersonalFile = { id: string; name: string; size: number };
export type PersonalSummary = {
  id: string;
  title: string;
  excerpt: string;
  version: number;
  updated_at: string;
  total: number;
  done: number;
  files: number;
};
export const personalWorkspace = {
  async list(
    q = "",
    offset = 0,
  ): Promise<{ items: PersonalSummary[]; next_offset: number }> {
    return (await api.get("/personal/items", { params: { q, offset } })).data
      .data;
  },
  async get(
    id: string,
  ): Promise<{ item: PersonalItem; files: PersonalFile[] }> {
    return (await api.get(`/personal/items/${id}`)).data.data;
  },
  async save(item: PersonalItem): Promise<{ id: string; version: number }> {
    return (
      await (item.id
        ? api.put(`/personal/items/${item.id}`, item)
        : api.post("/personal/items", item))
    ).data.data;
  },
  async remove(item: PersonalItem) {
    await api.delete(`/personal/items/${item.id}`, {
      data: { version: item.version },
    });
  },
  async upload(item: PersonalItem, file: File) {
    const data = new FormData();
    data.set("version", String(item.version));
    data.set("file", file);
    return (await api.post(`/personal/items/${item.id}/files`, data)).data
      .data as { id: string; version: number };
  },
  async removeFile(item: PersonalItem, file: PersonalFile) {
    return (
      await api.delete(`/personal/items/${item.id}/files/${file.id}`, {
        data: { version: item.version },
      })
    ).data.data as { version: number };
  },
  async download(item: PersonalItem, file: PersonalFile) {
    const res = await api.get(`/personal/items/${item.id}/files/${file.id}`, {
      responseType: "blob",
    });
    downloadBlob(res.data, file.name);
  },
};
export function personalNoteHref(
  classId: string,
  kind: string,
  id: string,
  title = "",
) {
  return `/personal?${new URLSearchParams({ new: "1", class: classId, kind, resource: id, title: title.slice(0, 160) })}`;
}
