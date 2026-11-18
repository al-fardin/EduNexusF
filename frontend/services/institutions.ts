import { api } from "@/lib/api";
export type InstitutionRole = "owner" | "admin" | "teacher" | "student";
export type InstitutionPlacement = {
  institution_id: string;
  department_id: string;
  term_id: string;
};
export type Institution = {
  id: string;
  name: string;
  role: InstitutionRole;
  version: number;
  classes: number;
};
export type InstitutionUnit = {
  id: string;
  name: string;
  version: number;
  starts_on: string;
  ends_on: string;
};
export type InstitutionWorkspace = Institution & {
  departments: InstitutionUnit[];
  terms: InstitutionUnit[];
};
export type InstitutionClass = {
  id: string;
  name: string;
  section: string;
  subject: string;
  status: string;
  department: string;
  semester: string;
  role: string;
  owned: boolean;
  url: string;
  version: number;
};
export type InstitutionMember = {
  id: string;
  name: string;
  email: string;
  role: InstitutionRole;
  version: number;
};
export type InstitutionInvite = {
  id: string;
  email: string;
  role: InstitutionRole;
  status: string;
  version: number;
  expires_at: string;
};
type Page<T> = { items: T[]; next_offset: number };
export const institutions = {
  async list(offset = 0, teaching = false): Promise<Page<Institution>> {
    return (
      await api.get("/institutions", {
        params: { offset, ...(teaching ? { teaching: "1" } : {}) },
      })
    ).data.data;
  },
  async create(name: string): Promise<{ id: string }> {
    return (await api.post("/institutions", { name })).data.data;
  },
  async get(id: string): Promise<InstitutionWorkspace> {
    return (await api.get(`/institutions/${id}`)).data.data;
  },
  async rename(id: string, name: string, version: number) {
    await api.patch(`/institutions/${id}`, { name, version });
  },
  async classes(
    id: string,
    offset = 0,
    department = "",
    term = "",
    q = "",
  ): Promise<Page<InstitutionClass>> {
    return (
      await api.get(`/institutions/${id}/classes`, {
        params: { offset, department, term, q },
      })
    ).data.data;
  },
  async unit(
    id: string,
    kind: "departments" | "terms",
    value: Partial<InstitutionUnit>,
    remove = false,
  ) {
    const path = `/institutions/${id}/${kind}${value.id ? `/${value.id}` : ""}`;
    if (remove) await api.delete(path, { data: { version: value.version } });
    else await api[value.id ? "patch" : "post"](path, value);
  },
  async placement(
    id: string,
  ): Promise<{
    placement: InstitutionPlacement;
    version: number;
    name: string;
    department: string;
    semester: string;
    can_manage: boolean;
  }> {
    return (await api.get(`/classrooms/${id}/institution`)).data.data;
  },
  async place(
    id: string,
    placement: InstitutionPlacement | null,
    version: number,
  ) {
    await api.put(`/classrooms/${id}/institution`, { placement, version });
  },
  async detach(id: string, item: InstitutionClass, reason: string) {
    await api.post(`/institutions/${id}/classes/${item.id}/detach`, {
      version: item.version,
      reason,
    });
  },
  async members(
    id: string,
    offset = 0,
    q = "",
  ): Promise<Page<InstitutionMember>> {
    return (
      await api.get(`/institutions/${id}/members`, { params: { offset, q } })
    ).data.data;
  },
  async member(
    id: string,
    member: InstitutionMember,
    role: InstitutionRole,
    reason: string,
    remove = false,
  ) {
    const body = { version: member.version, role, reason };
    if (remove)
      await api.delete(`/institutions/${id}/members/${member.id}`, {
        data: body,
      });
    else await api.patch(`/institutions/${id}/members/${member.id}`, body);
  },
  async invitations(id: string, offset = 0): Promise<Page<InstitutionInvite>> {
    return (
      await api.get(`/institutions/${id}/invitations`, { params: { offset } })
    ).data.data;
  },
  async invite(id: string, email: string, role: string) {
    await api.post(`/institutions/${id}/invitations`, { email, role });
  },
  async revoke(id: string, invite: InstitutionInvite) {
    await api.delete(`/institutions/${id}/invitations/${invite.id}`, {
      data: { version: invite.version },
    });
  },
  async inbox(
    offset = 0,
  ): Promise<
    Page<InstitutionInvite & { institution_id: string; name: string }> & {
      verified: boolean;
    }
  > {
    return (await api.get("/institutions/invitations", { params: { offset } }))
      .data.data;
  },
  async respond(invite: InstitutionInvite, action: "accept" | "decline") {
    await api.post(`/institutions/invitations/${invite.id}/respond`, {
      version: invite.version,
      action,
    });
  },
  async history(
    id: string,
    before = "",
  ): Promise<{
    items: Array<{
      id: string;
      actor: string;
      action: string;
      reason: string;
      created_at: string;
    }>;
    next: string;
  }> {
    return (
      await api.get(`/institutions/${id}/activity`, {
        params: before ? { before } : {},
      })
    ).data.data;
  },
};
