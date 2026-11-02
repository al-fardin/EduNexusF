"use client";
import {ContentSkeleton} from "@/components/ui/content-skeleton";
import Link from "next/link";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {AuthGuard} from "@/components/auth/auth-guard";
import {notifications} from "@/services/notifications";
import {examError} from "@/services/exams";
import {useAuthStore} from "@/store/auth-store";
export default function NotificationsPage(){
 const user=useAuthStore(s=>s.user);const client=useQueryClient();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const list=useQuery({queryKey:["notifications",user?.id],queryFn:()=>notifications.list(),enabled:!!user,refetchInterval:30000});
 const preferences=useQuery({queryKey:["notification-preferences",user?.id],queryFn:()=>notifications.preferences(),enabled:!!user});
 async function perform(fn:()=>Promise<unknown>){setBusy(true);setError("");try{await fn();await Promise.all([client.invalidateQueries({queryKey:["notifications",user?.id]}),client.invalidateQueries({queryKey:["notification-preferences",user?.id]})])}catch(e){setError(examError(e))}finally{setBusy(false)}}
 const btn="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
 return <AuthGuard><main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Class updates, deadlines and feedback.</p></div><button disabled={busy||!list.data?.unread_count} className={btn} onClick={()=>void perform(()=>notifications.readAll())}>Mark all read</button></div>
 {preferences.data&&<section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Delivery preferences</h2><div className="mt-3 flex flex-wrap gap-5">{([['app_enabled','In-app notifications'],['email_enabled','Email notifications']] as const).map(([key,label])=><label className="flex items-center gap-2 text-sm" key={key}><input type="checkbox" disabled={busy} checked={preferences.data![key]} onChange={e=>void perform(()=>notifications.savePreferences({...preferences.data!,[key]:e.target.checked}))}/>{label}</label>)}</div>{!preferences.data.email_configured&&<p className="mt-3 text-xs text-muted-foreground">Email delivery is awaiting server SMTP configuration.</p>}{!user?.email_verified&&<p className="mt-2 text-xs text-muted-foreground">Verify your email address to receive email notifications.</p>}</section>}
 {(error||list.isError||preferences.isError)&&<p role="alert" className="text-sm text-red-700">{error||examError(list.error||preferences.error)}</p>}{list.isPending&&<ContentSkeleton rows={3}/>}{list.data?.items.length===0&&<p className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">No notifications to show.</p>}
 <div className="space-y-3">{list.data?.items.map(n=><article key={n.id} className={`rounded-2xl border border-border p-5 ${n.read_at?'bg-card':'bg-secondary'}`}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{!n.read_at&&<span className="mr-2 text-xs text-primary">Unread</span>}{n.title}</h2><time className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p><div className="mt-3 flex gap-3"><Link href={n.url.startsWith('/student/classrooms/')||n.url.startsWith('/instructor/classrooms/')?n.url:'/'} className="text-sm font-semibold underline" onClick={()=>{void perform(()=>notifications.read(n.id))}}>View update</Link>{!n.read_at&&<button disabled={busy} className="text-sm underline" onClick={()=>void perform(()=>notifications.read(n.id))}>Mark read</button>}</div></article>)}</div>
 </main></AuthGuard>;
}
