import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url?: string | null;
  status: string;
  role: "student" | "instructor" | "admin";
  email_verified: boolean;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;

  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  setAccessToken: (token) =>
    set({
      accessToken: token,
    }),

  setUser: (user) =>
    set({
      user,
    }),

  logout: () =>
    set({
      accessToken: null,
      user: null,
    }),
}));