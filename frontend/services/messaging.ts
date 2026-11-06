import { api } from "@/lib/api";
import type { AxiosProgressEvent } from "axios";
export type MessageClass = {
  id: string;
  name: string;
  role: "teacher" | "student";
  unread: number;
};
export type Recipient = { id: string; name: string; role: string };
export type Conversation = {
  id: string;
  peer_id: string;
  name: string;
  role: string;
  last_message: string;
  last_at: string | null;
  unread: number;
  muted_until?: string | null;
};
export type ChatTheme =
  "violet" | "lavender" | "ocean" | "sage" | "rose" | "midnight";
export type MessagingSettings = {
  role: "teacher" | "student";
  can_send: boolean;
  students_can_message: boolean;
  theme: ChatTheme;
  students: { id: string; name: string; roll: string; can_message: boolean }[];
};
export type ChatMessage = {
  kind: "text"|"emoji"|"voice";
  emoji_size: number;
  duration_ms: number;
  reply?: { id: string; sender_id: string; body: string; deleted: boolean };
  edited_at?: string;
  deleted_at?: string;
  reactions: { emoji: string; user_id: string }[];
  attachment?: { name: string; size: number; type: string };
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client_request_id: string;
};
export type MessagePage = {
  messages: ChatMessage[];
  has_more: boolean;
  peer_last_read: string;
  last_read: string;
};
export type PinnedMessage = {id:string;body:string;file_name:string;pinned_by:string;pinned_at:string};
const base = (id: string) => `/classrooms/${id}`;
export const messaging = {
  async preferences(id:string,thread:string):Promise<{muted_until:string|null;muted:boolean}>{return (await api.get(`${base(id)}/conversations/${thread}/preferences`)).data.data;},
  async mute(id:string,thread:string,hours:number){await api.put(`${base(id)}/conversations/${thread}/preferences`,{hours});},
  async pins(id:string,thread:string):Promise<PinnedMessage[]>{return (await api.get(`${base(id)}/conversations/${thread}/pins`)).data.data;},
  async pin(id:string,thread:string,message:string,pinned:boolean){await api.put(`${base(id)}/conversations/${thread}/messages/${message}/pin`,{pinned});},
  async stars(id:string,thread:string):Promise<string[]>{return (await api.get(`${base(id)}/conversations/${thread}/stars`)).data.data},
  async star(id:string,thread:string,message:string,starred:boolean){await api.put(`${base(id)}/conversations/${thread}/messages/${message}/star`,{starred})},
  async edit(id: string, thread: string, message: string, body: string) {
    await api.patch(`${base(id)}/conversations/${thread}/messages/${message}`, {
      body,
    });
  },
  async remove(id: string, thread: string, message: string) {
    await api.delete(`${base(id)}/conversations/${thread}/messages/${message}`);
  },
  async react(id: string, thread: string, message: string, emoji: string) {
    await api.put(
      `${base(id)}/conversations/${thread}/messages/${message}/reaction`,
      { emoji },
    );
  },
  async settings(id: string): Promise<MessagingSettings> {
    return (await api.get(`${base(id)}/messaging-settings`)).data.data;
  },
  async policy(id: string, students_can_message: boolean) {
    await api.put(`${base(id)}/messaging-policy`, { students_can_message });
  },
  async studentPolicy(id: string, student: string, can_message: boolean) {
    await api.put(`${base(id)}/messaging-policy/students/${student}`, {
      can_message,
    });
  },
  async theme(id: string, thread: string): Promise<{ theme: ChatTheme | "" }> {
    return (await api.get(`${base(id)}/conversations/${thread}/theme`)).data
      .data;
  },
  async setTheme(id: string, theme: ChatTheme | "", thread?: string) {
    await api.put(
      thread
        ? `${base(id)}/conversations/${thread}/theme`
        : `${base(id)}/message-theme`,
      { theme },
    );
  },
  async download(id: string, thread: string, message: string, name: string) {
    const response = await api.get<Blob>(
      `${base(id)}/conversations/${thread}/messages/${message}/file`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
  async classes(): Promise<MessageClass[]> {
    return (await api.get("/messaging/classes")).data.data;
  },
  async unread(): Promise<{ unread: number }> {
    return (await api.get("/messaging/unread")).data.data;
  },
  async recipients(id: string): Promise<Recipient[]> {
    return (await api.get(`${base(id)}/message-recipients`)).data.data;
  },
  async conversations(id: string): Promise<Conversation[]> {
    return (await api.get(`${base(id)}/conversations`)).data.data;
  },
  async create(id: string, recipient_id: string): Promise<{ id: string }> {
    return (await api.post(`${base(id)}/conversations`, { recipient_id })).data
      .data;
  },
  async history(
    id: string,
    thread: string,
    before_id = "",
    q = "",
    starred = false,
  ): Promise<MessagePage> {
    return (
      await api.get(`${base(id)}/conversations/${thread}/messages`, {
        params: { before_id: before_id || undefined, q: q || undefined,starred:starred?'1':undefined },
      })
    ).data.data;
  },
  async send(
    id: string,
    thread: string,
    body: string,
    client_request_id: string,
    file?: File | null,
    reply_to_id = "",
    options?: {
      signal?: AbortSignal;
      onUploadProgress?: (event: AxiosProgressEvent) => void;
      message?: {kind:"text"|"emoji"|"voice";emoji_size?:number;duration_ms?:number};
    },
  ): Promise<ChatMessage> {
    const {message,...transport}=options??{};
    if (file) {
      const form = new FormData();
      form.append("body", body);
      form.append("reply_to_id", reply_to_id);
      form.append("client_request_id", client_request_id);
      form.append("file", file);
      if(message){form.append('kind',message.kind);form.append('emoji_size',String(message.emoji_size??1));form.append('duration_ms',String(message.duration_ms??0))}
      return (
        await api.post(`${base(id)}/conversations/${thread}/messages`, form, {
          headers: { "Content-Type": undefined },
          ...transport,
        })
      ).data.data;
    }
    return (
      await api.post(
        `${base(id)}/conversations/${thread}/messages`,
        {
          body,
          client_request_id,
          reply_to_id,
          ...message,
        },
        transport,
      )
    ).data.data;
  },
  async read(id: string, thread: string, last_message_id: string) {
    await api.post(`${base(id)}/conversations/${thread}/read`, {
      last_message_id,
    });
  },
};
