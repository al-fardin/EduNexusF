"use client";
import {useSyncExternalStore} from "react";
import {useAuthStore} from "@/store/auth-store";
const subscribe=(listener:()=>void)=>{window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener)};
const snapshot=()=>{try{return Boolean(localStorage.getItem("access_token")||localStorage.getItem("refresh_token"))}catch{return false}};
export function useHasSession(){const user=useAuthStore(s=>s.user);const token=useAuthStore(s=>s.accessToken);const saved=useSyncExternalStore(subscribe,snapshot,()=>false);return Boolean(user||token||saved)}
