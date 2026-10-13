"use client";

import {
  useEffect,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

function subscribe() {
  return () => {};
}

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const accessToken = useAuthStore(
    (state) => state.accessToken
  );

  const setAccessToken = useAuthStore(
    (state) => state.setAccessToken
  );

  const savedToken = isClient
    ? window.localStorage.getItem(
        "access_token"
      )
    : null;

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (!savedToken) {
      router.replace("/login");
      return;
    }

    if (!accessToken) {
      setAccessToken(savedToken);
    }
  }, [
    accessToken,
    isClient,
    router,
    savedToken,
    setAccessToken,
  ]);

  if (!isClient || !accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-border border-t-zinc-950" />

          <p className="mt-4 text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}