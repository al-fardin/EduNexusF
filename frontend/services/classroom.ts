import axios from "axios";

import { api } from "@/lib/api";

export type ClassroomStatus =
  | "active"
  | "archived";

export type Classroom = {
  id: string;
  owner_id: string;
  name: string;
  section?: string;
  subject?: string;
  room?: string;
  description?: string;
  class_code: string;
  status: ClassroomStatus;
  created_at: string;
  updated_at: string;
  archived_at?: string;
};

export type ClassroomMember = {
  membership_id: string;
  classroom_id: string;
  user_id: string;
  member_role: "teacher" | "student";
  status: "active" | "removed";
  joined_at: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
};

export type CreateClassroomInput = {
  name: string;
  section: string;
  subject: string;
  room: string;
  description: string;
};

export type UpdateClassroomInput =
  CreateClassroomInput;

export type JoinClassroomInput = {
  class_code: string;
};

export type JoinClassroomResult = {
  membership_id: string;
  member_role: "teacher" | "student";
  joined_at: string;
  classroom: Classroom;
};

export type ClassroomListData = {
  items: Classroom[];
  page: number;
  limit: number;
};

export type ClassroomMemberListData = {
  items: ClassroomMember[];
  page: number;
  limit: number;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const classroomService = {
  async create(
    input: CreateClassroomInput
  ): Promise<Classroom> {
    const response = await api.post<
      ApiResponse<Classroom>
    >("/classrooms", input);

    return response.data.data;
  },

  async listMine(
    page = 1,
    limit = 10
  ): Promise<ClassroomListData> {
    const response = await api.get<
      ApiResponse<ClassroomListData>
    >("/classrooms/mine", {
      params: {
        page,
        limit,
      },
    });

    return response.data.data;
  },

  async getMine(
    classroomId: string
  ): Promise<Classroom> {
    const response = await api.get<
      ApiResponse<Classroom>
    >(`/classrooms/${classroomId}`);

    return response.data.data;
  },

  async update(
    classroomId: string,
    input: UpdateClassroomInput
  ): Promise<Classroom> {
    const response = await api.put<
      ApiResponse<Classroom>
    >(
      `/classrooms/${classroomId}`,
      input
    );

    return response.data.data;
  },

  async archive(
    classroomId: string
  ): Promise<Classroom> {
    const response = await api.patch<
      ApiResponse<Classroom>
    >(
      `/classrooms/${classroomId}/archive`
    );

    return response.data.data;
  },

  async unarchive(
    classroomId: string
  ): Promise<Classroom> {
    const response = await api.patch<
      ApiResponse<Classroom>
    >(
      `/classrooms/${classroomId}/unarchive`
    );

    return response.data.data;
  },

  async remove(
    classroomId: string
  ): Promise<void> {
    await api.delete(
      `/classrooms/${classroomId}`
    );
  },

  async listMembers(
    classroomId: string,
    page = 1,
    limit = 100
  ): Promise<ClassroomMemberListData> {
    const response = await api.get<
      ApiResponse<ClassroomMemberListData>
    >(
      `/classrooms/${classroomId}/members`,
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data.data;
  },

  async removeMember(
    classroomId: string,
    userId: string
  ): Promise<void> {
    await api.delete(
      `/classrooms/${classroomId}/members/${userId}`
    );
  },

  async join(
    input: JoinClassroomInput
  ): Promise<JoinClassroomResult> {
    const response = await api.post<
      ApiResponse<JoinClassroomResult>
    >("/classrooms/join", input);

    return response.data.data;
  },

  async listJoined(
    page = 1,
    limit = 10
  ): Promise<ClassroomListData> {
    const response = await api.get<
      ApiResponse<ClassroomListData>
    >("/classrooms/joined", {
      params: {
        page,
        limit,
      },
    });

    return response.data.data;
  },

  async getJoined(
    classroomId: string
  ): Promise<Classroom> {
    const response = await api.get<
      ApiResponse<Classroom>
    >(
      `/classrooms/joined/${classroomId}`
    );

    return response.data.data;
  },
};

export function getClassroomErrorMessage(
  error: unknown
): string {
  if (
    axios.isAxiosError<{
      message?: string;
    }>(error)
  ) {
    return (
      error.response?.data?.message ??
      "Request failed."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}