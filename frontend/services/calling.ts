import { api } from "@/lib/api";
export type ClassroomCall = {
  id: string;
  classroom_id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  peer_id: string;
  peer_name: string;
  classroom_name: string;
  media: "audio" | "video";
  state: "ringing" | "active" | "ended";
  reason: string;
  owned: boolean;
  created_at: string;
  accepted_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
};
export type CallSignal = {
  id: string;
  kind: "offer" | "answer" | "ice";
  payload: RTCSessionDescriptionInit & RTCIceCandidateInit;
};
export const calling = {
  config: async (
    session?: string,
    call?: string,
  ): Promise<{
    ice_servers: RTCIceServer[];
    relay_configured: boolean;
  }> =>
    (await api.get("/calling/config", { params: { session, call } })).data.data,
  active: async (session: string): Promise<ClassroomCall | null> =>
    (await api.get("/calling/active", { params: { session } })).data.data,
  create: async (
    session: string,
    conversation_id: string,
    media: "audio" | "video",
    client_request_id: string,
  ): Promise<ClassroomCall> =>
    (
      await api.post(
        "/calling",
        { conversation_id, media, client_request_id },
        { params: { session } },
      )
    ).data.data,
  action: async (session: string, id: string, action: string) => {
    await api.post(
      `/calling/${id}/action`,
      { action },
      { params: { session } },
    );
  },
  sync: async (
    session: string,
    id: string,
    after: string,
  ): Promise<{ call: ClassroomCall; signals: CallSignal[] }> =>
    (await api.get(`/calling/${id}`, { params: { session, after } })).data.data,
  signal: async (
    session: string,
    id: string,
    kind: string,
    payload: unknown,
    request_id: string,
  ) => {
    await api.post(
      `/calling/${id}/signals`,
      { kind, payload, request_id },
      { params: { session } },
    );
  },
  history: async (session: string, thread: string): Promise<ClassroomCall[]> =>
    (await api.get(`/calling/history/${thread}`, { params: { session } })).data
      .data,
};
