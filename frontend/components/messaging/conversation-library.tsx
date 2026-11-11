"use client";
import {useState} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {messaging,type ChatMessage} from "@/services/messaging";
import {MessageFile} from "./message-file";
import {Button} from "@/components/ui/button";
import {EmptyState,ErrorState} from "@/components/ui/app-feedback";
import {ContentSkeleton} from "@/components/ui/content-skeleton";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {examError} from "@/services/exams";
export function ConversationLibrary({classId,thread}:{classId:string;thread:string}){
 const [open,setOpen]=useState(false),[kind,setKind]=useState("all"),[q,setQ]=useState("");
 const query=useInfiniteQuery({queryKey:["conversation-library",classId,thread,kind,q],initialPageParam:"",queryFn:({pageParam})=>messaging.library(classId,thread,{kind,q,before:pageParam||undefined}),getNextPageParam:page=>page.next||undefined,enabled:open});const items:ChatMessage[]=query.data?.pages.flatMap(p=>p.items)??[];
 return <><Button variant="outline" className="w-full" onClick={()=>setOpen(true)}>Shared files & media</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Shared files & media</DialogTitle><DialogDescription>Attachments in this conversation.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2"><input aria-label="Search shared file names" placeholder="Search file names" maxLength={200} className="min-w-0 flex-1 rounded-xl border border-border bg-card p-2 text-sm" value={q} onChange={e=>setQ(e.target.value)}/><select aria-label="Shared attachment type" value={kind} onChange={e=>setKind(e.target.value)} className="rounded-xl border border-border bg-card p-2 text-sm"><option value="all">All attachments</option><option value="media">Media</option><option value="files">Documents</option></select></div>{query.isPending?<ContentSkeleton rows={2}/>:query.isError?<ErrorState message={examError(query.error)} onRetry={()=>void query.refetch()}/>:!items.length?<EmptyState title="No matching attachments"/>:<div className="space-y-3">{items.map(message=><article key={message.id} className="min-w-0 space-y-2 rounded-xl border border-border p-3"><p className="break-all text-sm font-medium">{message.attachment?.name}</p><p className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString()} · {Math.ceil((message.attachment?.size??0)/1024)} KB</p><MessageFile classId={classId} thread={thread} message={message}/></article>)}</div>}{query.hasNextPage&&<Button variant="outline" disabled={query.isFetchingNextPage} onClick={()=>void query.fetchNextPage()}>More files</Button>}</DialogContent></Dialog></>;
}
