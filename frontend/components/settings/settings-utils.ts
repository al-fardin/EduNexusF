import axios from "axios";

import { type AuthUser } from "@/store/auth-store";
type ApiErrorResponse = {
  message?: string;
};

export function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  return score;
}

export function normalizeAvatarUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  return isValidWebUrl(value) ? value : "";
}

export function isValidWebUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getInitials(user: AuthUser | null) {
  if (!user) {
    return "EN";
  }

  const first = user.first_name.charAt(0);

  const last = user.last_name.charAt(0);

  return `${first}${last}`.toUpperCase();
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}
