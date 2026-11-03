"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut } from "lucide-react";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { authService } from "@/services/auth";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

export function ProfileAccount({user}:{user:AuthUser|null}) {
  const router=useRouter();const [busy,setBusy]=useState(false);
  async function signOut(){setBusy(true);try{const token=window.localStorage.getItem("refresh_token");if(token)await authService.logout(token)}finally{window.localStorage.removeItem("access_token");window.localStorage.removeItem("refresh_token");useAuthStore.getState().logout();router.replace("/login")}}
  return <section className="my-6 space-y-4" aria-label="Account verification and session">
    {user&&(user.email_verified?<p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={17} className="text-primary"/>Email verified</p>:<EmailVerificationBanner email={user.email}/>)}
    <button className="en-outline-button" disabled={busy} onClick={()=>void signOut().catch(()=>{})}><LogOut size={17}/>{busy?"Signing out…":"Sign out"}</button>
  </section>;
}
