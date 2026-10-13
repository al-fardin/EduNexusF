import axios from "axios";

import { api } from "@/lib/api";

export type StreamPostType =
  | "announcement"
  | "assignment"
  | "material"
  | "exam"
  | "system";

export type StreamAuthor = {
  id?: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
};

export type StreamPost = {
  id: string;
  classroom_id: string;
  author_id?: string;
  post_type: StreamPostType;
  title?: string;
  content: string;
  reference_type?: string;
  reference_id?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: StreamAuthor;
};

export type AnnouncementInput = {
  title: string;
  content: string;
};

export type StreamListData = {
  items: StreamPost[];
  page: number;
  limit: number;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const streamService = {
  async list(
    classroomId: string,
    page = 1,
    limit = 10
  ): Promise<StreamListData> {
    const response = await api.get<
      ApiResponse<StreamListData>
    >(`/classrooms/${classroomId}/stream`, {
      params: {
        page,
        limit,
      },
    });

    return response.data.data;
  },

  async createAnnouncement(
    classroomId: string,
    input: AnnouncementInput
  ): Promise<StreamPost> {
    const response = await api.post<
      ApiResponse<StreamPost>
    >(
      `/classrooms/${classroomId}/stream/announcements`,
      input
    );

    return response.data.data;
  },

  async updateAnnouncement(
    classroomId: string,
    postId: string,
    input: AnnouncementInput
  ): Promise<StreamPost> {
    const response = await api.put<
      ApiResponse<StreamPost>
    >(
      `/classrooms/${classroomId}/stream/announcements/${postId}`,
      input
    );

    return response.data.data;
  },

  async pin(
    classroomId: string,
    postId: string
  ): Promise<StreamPost> {
    const response = await api.patch<
      ApiResponse<StreamPost>
    >(
      `/classrooms/${classroomId}/stream/posts/${postId}/pin`
    );

    return response.data.data;
  },

  async unpin(
    classroomId: string,
    postId: string
  ): Promise<StreamPost> {
    const response = await api.patch<
      ApiResponse<StreamPost>
    >(
      `/classrooms/${classroomId}/stream/posts/${postId}/unpin`
    );

    return response.data.data;
  },

  async remove(
    classroomId: string,
    postId: string
  ): Promise<void> {
    await api.delete(
      `/classrooms/${classroomId}/stream/posts/${postId}`
    );
  },
};

export function getStreamErrorMessage(
  error: unknown
): string {
  if (
    axios.isAxiosError<{
      message?: string;
    }>(error)
  ) {
    return (
      error.response?.data?.message ??
      "Unable to complete the stream request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}