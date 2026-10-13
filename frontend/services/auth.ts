import { api } from "@/lib/api";

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
export interface UpdateProfileRequest {
  avatar_url: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export const authService = {
  register: async (data: RegisterRequest) => {
    const res = await api.post(
      "/auth/register",
      data
    );

    return res.data;
  },

  login: async (data: LoginRequest) => {
    const res = await api.post(
      "/auth/login",
      data
    );

    return res.data;
  },

  refresh: async (data: RefreshRequest) => {
    const res = await api.post(
      "/auth/refresh",
      data
    );

    return res.data;
  },

  me: async () => {
    const res = await api.get("/auth/me");

    return res.data;
  },

  logout: async (refresh_token: string) => {
    const res = await api.post(
      "/auth/logout",
      {
        refresh_token,
      }
    );

    return res.data;
  },

  logoutAll: async () => {
    const res = await api.post(
      "/auth/logout-all"
    );

    return res.data;
  },

  verifyEmail: async (
    data: VerifyEmailRequest
  ) => {
    const res = await api.post(
      "/auth/verify-email",
      data
    );

    return res.data;
  },

  resendVerification: async (
    data: ResendVerificationRequest
  ) => {
    const res = await api.post(
      "/auth/resend-verification",
      data
    );

    return res.data;
  },

  forgotPassword: async (
    data: ForgotPasswordRequest
  ) => {
    const res = await api.post(
      "/auth/forgot-password",
      data
    );

    return res.data;
  },

    resetPassword: async (
    data: ResetPasswordRequest
  ) => {
    const res = await api.post(
      "/auth/reset-password",
      data
    );

    return res.data;
  },

  updateProfile: async (
    data: UpdateProfileRequest
  ) => {
    const res = await api.put(
      "/auth/profile",
      data
    );

    return res.data;
  },

  changePassword: async (
    data: ChangePasswordRequest
  ) => {
    const res = await api.put(
      "/auth/password",
      data
    );

    return res.data;
  },
};