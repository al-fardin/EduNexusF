"use client";

import { useAuthStore } from "@/store/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.user?.id && previous.user.id !== state.user?.id)
          queryClient.clear();
      }),
    [queryClient],
  );

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== "access_token") return;
      const state = useAuthStore.getState();
      if (event.newValue === state.accessToken) return;
      if (!event.newValue) {
        state.logout();
        queryClient.clear();
        return;
      }
      let nextUser = "";
      try {
        const payload = event.newValue
          .split(".")[1]
          .replaceAll("-", "+")
          .replaceAll("_", "/");
        nextUser = JSON.parse(atob(payload)).user_id ?? "";
      } catch {}
      if (nextUser !== state.user?.id) state.setUser(null);
      state.setAccessToken(event.newValue);
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
