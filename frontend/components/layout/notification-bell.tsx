"use client";
import {useEnrollmentInbox} from "@/components/workspace/enrollment-inbox";
import Link from "next/link";
import {Bell} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {notifications} from "@/services/notifications";
import {useAuthStore} from "@/store/auth-store";
export function NotificationBell(){const user=useAuthStore(s=>s.user);const query=useQuery({queryKey:["notifications",user?.id],queryFn:()=>notifications.list(),enabled:!!user,refetchInterval:30000,refetchIntervalInBackground:false});const invitation=useEnrollmentInbox();const unread=(query.data?.unread_count??0)+(invitation.data?.pending_invitations??0);return user?<Link href="/notifications" className="en-user relative" aria-label={`Notifications${unread?`, ${unread} unread`:""}`}><Bell size={18}/>{unread>0&&<span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unread>99?"99+":unread}</span>}</Link>:null;}
