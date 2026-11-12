"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {safeReturnPath} from "@/lib/return-path";

import { VerificationPrompt } from "@/components/auth/verification-prompt";
import { authService } from "@/services/auth";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

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

  const user=useAuthStore(state=>state.user);
  const setUser=useAuthStore(state=>state.setUser);
  const [profileError,setProfileError]=useState(false);
  const [profileRetry,setProfileRetry]=useState(0);
  useEffect(()=>{if(!accessToken||user)return;let cancelled=false;authService.me().then(response=>{if(!cancelled){setUser(response.data as AuthUser);setProfileError(false)}}).catch(()=>{if(!cancelled)setProfileError(true)});return()=>{cancelled=true};},[accessToken,user,setUser,profileRetry]);

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
      router.replace("/login?next="+encodeURIComponent(safeReturnPath(window.location.pathname+window.location.search+window.location.hash)));
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

  if(profileError&&!user)return <main className="flex min-h-screen items-center justify-center"><div className="space-y-3 text-center"><p>Unable to verify your account. Check your connection.</p><button className="rounded-xl border border-border px-4 py-2" onClick={()=>{setProfileError(false);setProfileRetry(n=>n+1)}}>Retry</button></div></main>;
  if (!isClient || !accessToken || !user) {
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

  return <><VerificationPrompt key={user.id}/>{children}</>;
}
