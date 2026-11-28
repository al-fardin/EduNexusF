"use client";
import {AuthGuard} from "@/components/auth/auth-guard";
import {WorkspaceHome} from "@/components/workspace/workspace-home";
import {LandingPage} from "@/components/landing/landing-page";
import {useHasSession} from "@/lib/use-has-session";
export default function Page(){return useHasSession()?<AuthGuard><WorkspaceHome/></AuthGuard>:<LandingPage/>}
