import { api } from "@/lib/api";
export type JoinPolicy = {
  join_mode: "direct" | "approval";
  code_join_enabled: boolean;
  class_code_expires_at: string | null;
};
export type JoinSettings = JoinPolicy & {
  version: number;
  class_code: string;
  email_configured: boolean;
};
export type JoinRequest = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  student_roll: string;
  status: string;
  reason: string;
  version: number;
  updated_at: string;
};
export type ClassInvitation = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  version: number;
  updated_at: string;
  email_status: string;
  active_member: boolean;
};
export type EnrollmentItem = {
  id: string;
  kind: "invitation" | "request";
  classroom_id: string;
  classroom_name: string;
  teacher_name: string;
  status: string;
  student_roll: string;
  reason: string;
  version: number;
  updated_at: string;
  expires_at: string | null;
};
type Page<T> = { items: T[]; next_offset: number };
export const enrollment = {
  async settings(id: string): Promise<JoinSettings> {
    return (await api.get(`/classrooms/${id}/join-settings`)).data.data;
  },
  async saveSettings(
    id: string,
    data: JoinPolicy & { version: number },
  ): Promise<JoinSettings> {
    return (await api.put(`/classrooms/${id}/join-settings`, data)).data.data;
  },
  async requests(
    id: string,
    state: string,
    offset = 0,
  ): Promise<Page<JoinRequest>> {
    return (
      await api.get(`/classrooms/${id}/enrollment/requests`, {
        params: { state, offset },
      })
    ).data.data;
  },
  async review(
    id: string,
    request: JoinRequest,
    status: "approved" | "rejected",
    reason = "",
  ) {
    await api.post(
      `/classrooms/${id}/enrollment/requests/${request.id}/respond`,
      { status, version: request.version, reason },
    );
  },
  async invitations(
    id: string,
    offset = 0,
  ): Promise<Page<ClassInvitation> & { email_configured: boolean }> {
    return (
      await api.get(`/classrooms/${id}/enrollment/invitations`, {
        params: { offset },
      })
    ).data.data;
  },
  async invite(id: string, email: string) {
    return (
      await api.post(`/classrooms/${id}/enrollment/invitations`, { email })
    ).data.data;
  },
  async revoke(id: string, invite: ClassInvitation) {
    await api.post(
      `/classrooms/${id}/enrollment/invitations/${invite.id}/revoke`,
      { version: invite.version },
    );
  },
  async inbox(
    offset = 0,
    invite = "",
  ): Promise<
    Page<EnrollmentItem> & {
      pending_invitations: number;
      email_verified: boolean;
    }
  > {
    return (
      await api.get("/workspace/enrollment", { params: { offset, invite } })
    ).data.data;
  },
  async respond(
    invite: EnrollmentItem,
    status: "accepted" | "declined",
    student_roll = "",
  ): Promise<{ classroom_id: string; status: string }> {
    return (
      await api.post(`/workspace/enrollment/invitations/${invite.id}/respond`, {
        version: invite.version,
        status,
        student_roll,
      })
    ).data.data;
  },
  async cancel(request: EnrollmentItem) {
    await api.post(`/workspace/enrollment/requests/${request.id}/cancel`, {
      version: request.version,
    });
  },
};
