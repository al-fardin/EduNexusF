import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/store/auth-store";

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type RetryRequestConfig =
  InternalAxiosRequestConfig & {
    _retry?: boolean;
  };

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * আলাদা Axios instance।
 * এতে মূল API interceptor চলবে না,
 * তাই refresh request infinite loop করবে না।
 */
const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise:
  | Promise<TokenPair>
  | null = null;

const publicAuthRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
];

function isPublicAuthRoute(
  url?: string
) {
  if (!url) {
    return false;
  }

  return publicAuthRoutes.some((route) =>
    url.includes(route)
  );
}

function saveTokens(tokens: TokenPair) {
  useAuthStore
    .getState()
    .setAccessToken(tokens.access_token);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "access_token",
      tokens.access_token
    );

    window.localStorage.setItem(
      "refresh_token",
      tokens.refresh_token
    );
  }
}

function clearAuthentication() {
  useAuthStore.getState().logout();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(
      "access_token"
    );

    window.localStorage.removeItem(
      "refresh_token"
    );
  }
}

async function requestNewTokens(
  refreshToken: string
): Promise<TokenPair> {
  const response =
    await refreshClient.post<
      ApiResponse<TokenPair>
    >("/auth/refresh", {
      refresh_token: refreshToken,
    });

  return response.data.data;
}

/*
 * প্রতিটি request-এর আগে access token
 * Authorization header-এ যোগ করে।
 */
api.interceptors.request.use(
  (config) => {
    const storeToken =
      useAuthStore.getState().accessToken;

    const savedToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
            "access_token"
          )
        : null;

    const token = storeToken ?? savedToken;

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) =>
    Promise.reject(error)
);

/*
 * Protected API থেকে 401 এলে
 * refresh token দিয়ে নতুন token নেয়।
 */
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | RetryRequestConfig
        | undefined;

    const isUnauthorized =
      error.response?.status === 401;

    if (
      !isUnauthorized ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicAuthRoute(
        originalRequest.url
      )
    ) {
      return Promise.reject(error);
    }

    const refreshToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
            "refresh_token"
          )
        : null;

    if (!refreshToken) {
      clearAuthentication();

      if (
        typeof window !== "undefined" &&
        window.location.pathname !==
          "/login"
      ) {
        window.location.replace(
          "/login"
        );
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * একসঙ্গে একাধিক API 401 দিলে
       * শুধু একটি refresh request যাবে।
       */
      if (!refreshPromise) {
        refreshPromise =
          requestNewTokens(
            refreshToken
          ).finally(() => {
            refreshPromise = null;
          });
      }

      const newTokens =
        await refreshPromise;

      saveTokens(newTokens);

      originalRequest.headers.Authorization =
        `Bearer ${newTokens.access_token}`;

      return api(originalRequest);
    } catch (refreshError: unknown) {
      clearAuthentication();

      if (
        typeof window !== "undefined" &&
        window.location.pathname !==
          "/login"
      ) {
        window.location.replace(
          "/login"
        );
      }

      return Promise.reject(
        refreshError
      );
    }
  }
);

// EduNexus UX V3: report every API operation for a shared non-blocking loading UI.
// This interceptor does not delay requests, modify authentication or change responses.
type EduNexusTrackedConfig = InternalAxiosRequestConfig & {
  __eduNexusUXTracked?: boolean;
  __eduNexusUXWrite?: boolean;
};
let eduNexusRequests = 0;
let eduNexusWrites = 0;
function notifyEduNexusUX() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("edunexus:api-status", {
    detail: { active: eduNexusRequests, writes: eduNexusWrites },
  }));
}
function settleEduNexusUX(config?: EduNexusTrackedConfig) {
  if (!config?.__eduNexusUXTracked) return;
  config.__eduNexusUXTracked = false;
  eduNexusRequests = Math.max(0, eduNexusRequests - 1);
  if (config.__eduNexusUXWrite) eduNexusWrites = Math.max(0, eduNexusWrites - 1);
  notifyEduNexusUX();
}
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const tracked = config as EduNexusTrackedConfig;
    if (!tracked.__eduNexusUXTracked) {
      tracked.__eduNexusUXTracked = true;
      tracked.__eduNexusUXWrite = !["get", "head", "options"].includes((tracked.method || "get").toLowerCase());
      eduNexusRequests += 1;
      if (tracked.__eduNexusUXWrite) eduNexusWrites += 1;
      notifyEduNexusUX();
    }
  }
  return config;
});
api.interceptors.response.use(
  (response) => {
    settleEduNexusUX(response.config as EduNexusTrackedConfig);
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) settleEduNexusUX(error.config as EduNexusTrackedConfig | undefined);
    return Promise.reject(error);
  },
);
