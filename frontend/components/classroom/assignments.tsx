"use client";
import {AssignmentRubricEditor} from "./grading-tools";
import {useTopics,matchesTopic,ResourceTopicPicker} from "./classwork-topics";
import { ArrowLeft } from "lucide-react";
import {AssignmentDetails} from "./assignment-details";
import {useSearchParams} from "next/navigation";
import {EmptyState} from "@/components/ui/app-feedback";
import {ContentSkeleton} from "@/components/ui/content-skeleton";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {assignments,type Assignment} from "@/services/assignments";
import {examError} from "@/services/exams";
const btn="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const field="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm";
const date=(s:string)=>new Date(s).toLocaleString();
export function AssignmentBoard({classroomId,canManage,topic=""}:{classroomId:string;canManage:boolean;topic?:string}){
 const topicData=useTopics(classroomId);const params=useSearchParams();
 const client=useQueryClient();const [editing,setEditing]=useState<Partial<Assignment>|null>(null);const [selected,setSelected]=useState<string|null>(params.get("assignment"));const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const listing=useQuery({queryKey:["assignments",classroomId],networkMode:"always",queryFn:()=>assignments.list(classroomId)});
 const refresh=()=>client.invalidateQueries({queryKey:["assignments",classroomId]});
 async function publish(id:string){setBusy(true);setError("");try{await assignments.publish(classroomId,id);await refresh()}catch(e){setError(examError(e))}finally{setBusy(false)}}
 if(editing)return <div className="en-composer-view"><button className="en-composer-back" onClick={()=>setEditing(null)}><ArrowLeft size={17}/>Back to assignments</button><AssignmentEditor classroomId={classroomId} key={editing.id??"new"} value={editing} onCancel={()=>setEditing(null)} onSave={async value=>{await assignments.save(classroomId,value);await refresh();setEditing(null)}}/></div>;
 return <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Assignments</h2><p className="mt-1 text-sm text-muted-foreground">Coursework, submissions and feedback.</p></div>{canManage&&<button className={btn} onClick={()=>setEditing({allow_resubmit:true,max_points:100})}>Create assignment</button>}</div>

 {listing.isPending&&<ContentSkeleton rows={2}/>}{(error||listing.isError)&&<p role="alert" className="text-sm text-destructive">{error||examError(listing.error)}</p>}
 {listing.data?.filter(a=>matchesTopic(topicData.data?.links,topic,"assignment",a.id)).length===0&&<EmptyState title={topic?"No assignments in this topic":"No assignments yet"}/>}
 {listing.data?.filter(a=>matchesTopic(topicData.data?.links,topic,"assignment",a.id)).map(a=><article key={a.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{a.title}</h3>{canManage&&<ResourceTopicPicker classId={classroomId} kind="assignment" id={a.id}/>}<p className="mt-1 text-xs text-muted-foreground">Due {date(a.due_at)} · {a.max_points} points · {a.status}{a.allow_late?" · Late work accepted":""}</p></div><div className="flex flex-wrap gap-2"><button className={btn} onClick={()=>setSelected(selected===a.id?null:a.id)}>{selected===a.id?"Close":"Open assignment"}</button>{canManage&&<><button className={btn} onClick={()=>setEditing(a)}>Edit</button>{a.status==="draft"&&<button className={btn} disabled={busy} onClick={()=>void publish(a.id)}>Publish</button>}</>}</div></div>{selected===a.id&&<AssignmentDetails classroomId={classroomId} assignment={a} canManage={canManage}/>}</article>)}
 </section>;
}
function AssignmentEditor({classroomId,value,onCancel,onSave}:{classroomId:string;value:Partial<Assignment>;onCancel:()=>void;onSave:(a:Partial<Assignment>)=>Promise<void>}){
 const [a,setA]=useState(value);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 return <form key={value.id||"new"} className="space-y-3 rounded-xl bg-secondary p-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await onSave(a)}catch(err){setError(examError(err))}finally{setBusy(false)}}}>
 <label className="block text-sm">Title<input required minLength={3} maxLength={200} className={field} value={a.title??""} onChange={e=>setA({...a,title:e.target.value})}/></label>
 <label className="block text-sm">Instructions<textarea maxLength={20000} rows={4} className={field} value={a.instructions??""} onChange={e=>setA({...a,instructions:e.target.value})}/></label>
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Due date<input required type="datetime-local" className={field} value={a.due_at?new Date(new Date(a.due_at).getTime()-new Date(a.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):""} onChange={e=>setA({...a,due_at:e.target.value?new Date(e.target.value).toISOString():""})}/></label><label className="text-sm">Maximum points<input required type="number" min={1} max={1000} className={field} value={a.max_points??100} onChange={e=>setA({...a,max_points:Number(e.target.value)})}/></label></div>
 <AssignmentRubricEditor classId={classroomId} value={a.rubric??[]} maximum={a.max_points??100} onChange={rubric=>setA({...a,rubric})}/>
 <label className="block text-sm">Reason for changes<input required={!!a.id} minLength={3} maxLength={1000} className={field} value={a.reason??""} onChange={e=>setA({...a,reason:e.target.value})}/></label>
 <label className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={a.allow_late??false} onChange={e=>setA({...a,allow_late:e.target.checked})}/>Accept late work</label><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={a.allow_resubmit??true} onChange={e=>setA({...a,allow_resubmit:e.target.checked})}/>Allow resubmission</label>
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><button className={btn} disabled={busy}>{busy?"Saving…":"Save assignment"}</button><button type="button" className={btn} disabled={busy} onClick={onCancel}>Cancel</button></div></form>;
}
