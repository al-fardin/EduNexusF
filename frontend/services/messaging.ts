import { api } from "@/lib/api";
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
  reactions: { emoji: string; user_id: string }[];
  attachment?: { name: string; size: number; type: string };
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client_request_id: string;
};
export type MessagePage = { messages: ChatMessage[]; has_more: boolean };
const base = (id: string) => `/classrooms/${id}`;
export const messaging = {
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
  ): Promise<MessagePage> {
    return (
      await api.get(`${base(id)}/conversations/${thread}/messages`, {
        params: before_id ? { before_id } : undefined,
      })
    ).data.data;
  },
  async send(
    id: string,
    thread: string,
    body: string,
    client_request_id: string,
    file?: File | null,
  ): Promise<ChatMessage> {
    if (file) {
      const form = new FormData();
      form.append("body", body);
      form.append("client_request_id", client_request_id);
      form.append("file", file);
      return (
        await api.post(`${base(id)}/conversations/${thread}/messages`, form, {
          headers: { "Content-Type": undefined },
        })
      ).data.data;
    }
    return (
      await api.post(`${base(id)}/conversations/${thread}/messages`, {
        body,
        client_request_id,
      })
    ).data.data;
  },
  async read(id: string, thread: string, last_message_id: string) {
    await api.post(`${base(id)}/conversations/${thread}/read`, {
      last_message_id,
    });
  },
};
