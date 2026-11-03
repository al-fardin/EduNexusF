"use client";
import { ArrowLeft } from "lucide-react";
import { clientId } from "@/lib/client-id";
import {ContentSkeleton} from "@/components/ui/content-skeleton";
import {useRef,useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {assignments,type Assignment,type Submission} from "@/services/assignments";
import {examError} from "@/services/exams";
const btn="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const field="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm";
const date=(s:string)=>new Date(s).toLocaleString();
export function AssignmentBoard({classroomId,canManage}:{classroomId:string;canManage:boolean}){
 const client=useQueryClient();const [editing,setEditing]=useState<Partial<Assignment>|null>(null);const [selected,setSelected]=useState<string|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const listing=useQuery({queryKey:["assignments",classroomId],queryFn:()=>assignments.list(classroomId)});
 const refresh=()=>client.invalidateQueries({queryKey:["assignments",classroomId]});
 async function publish(id:string){setBusy(true);setError("");try{await assignments.publish(classroomId,id);await refresh()}catch(e){setError(examError(e))}finally{setBusy(false)}}
 if(editing)return <div className="en-composer-view"><button className="en-composer-back" onClick={()=>setEditing(null)}><ArrowLeft size={17}/>Back to assignments</button><AssignmentEditor key={editing.id??"new"} value={editing} onCancel={()=>setEditing(null)} onSave={async value=>{await assignments.save(classroomId,value);await refresh();setEditing(null)}}/></div>;
 return <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Assignments</h2><p className="mt-1 text-sm text-muted-foreground">Coursework, submissions and feedback.</p></div>{canManage&&<button className={btn} onClick={()=>setEditing({allow_resubmit:true,max_points:100})}>Create assignment</button>}</div>

 {listing.isPending&&<ContentSkeleton rows={2}/>}{(error||listing.isError)&&<p role="alert" className="text-sm text-red-700">{error||examError(listing.error)}</p>}
 {listing.data?.length===0&&<p className="text-sm text-muted-foreground">No assignments yet.</p>}
 {listing.data?.map(a=><article key={a.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{a.title}</h3><p className="mt-1 text-xs text-muted-foreground">Due {date(a.due_at)} · {a.max_points} points · {a.status}{a.allow_late?" · Late work accepted":""}</p></div><div className="flex flex-wrap gap-2"><button className={btn} onClick={()=>setSelected(selected===a.id?null:a.id)}>{selected===a.id?"Close":"Open assignment"}</button>{canManage&&<><button className={btn} onClick={()=>setEditing(a)}>Edit</button>{a.status==="draft"&&<button className={btn} disabled={busy} onClick={()=>void publish(a.id)}>Publish</button>}</>}</div></div>{selected===a.id&&<AssignmentDetails classroomId={classroomId} assignment={a} canManage={canManage}/>}</article>)}
 </section>;
}
function AssignmentEditor({value,onCancel,onSave}:{value:Partial<Assignment>;onCancel:()=>void;onSave:(a:Partial<Assignment>)=>Promise<void>}){
 const [a,setA]=useState(value);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 return <form key={value.id||"new"} className="space-y-3 rounded-xl bg-secondary p-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await onSave(a)}catch(err){setError(examError(err))}finally{setBusy(false)}}}>
 <label className="block text-sm">Title<input required minLength={3} maxLength={200} className={field} value={a.title??""} onChange={e=>setA({...a,title:e.target.value})}/></label>
 <label className="block text-sm">Instructions<textarea maxLength={20000} rows={4} className={field} value={a.instructions??""} onChange={e=>setA({...a,instructions:e.target.value})}/></label>
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Due date<input required type="datetime-local" className={field} value={a.due_at?new Date(new Date(a.due_at).getTime()-new Date(a.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):""} onChange={e=>setA({...a,due_at:e.target.value?new Date(e.target.value).toISOString():""})}/></label><label className="text-sm">Maximum points<input required type="number" min={1} max={1000} className={field} value={a.max_points??100} onChange={e=>setA({...a,max_points:Number(e.target.value)})}/></label></div>
 <label className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={a.allow_late??false} onChange={e=>setA({...a,allow_late:e.target.checked})}/>Accept late work</label><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={a.allow_resubmit??true} onChange={e=>setA({...a,allow_resubmit:e.target.checked})}/>Allow resubmission</label>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-2"><button className={btn} disabled={busy}>{busy?"Saving…":"Save assignment"}</button><button type="button" className={btn} disabled={busy} onClick={onCancel}>Cancel</button></div></form>;
}
function AssignmentDetails({classroomId,assignment:a,canManage}:{classroomId:string;assignment:Assignment;canManage:boolean}){
 const client=useQueryClient();const [answer,setAnswer]=useState("");const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const request=useRef<string|null>(null);
 const history=useQuery({queryKey:["assignment-submissions",classroomId,a.id],queryFn:()=>assignments.submissions(classroomId,a.id)});
 const latest=history.data?.[0];const canSubmit=!canManage&&a.status==="published"&&(!latest||a.allow_resubmit)&&(!latest||latest.version<10);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");request.current??=clientId();const body=new FormData();body.append("answer",answer);body.append("request_id",request.current);body.append("expected_version",String(latest?.version??0));if(file)body.append("file",file);
 try{await assignments.submit(classroomId,a.id,body);request.current=null;setNotice("Submission confirmed");await client.invalidateQueries({queryKey:["assignment-submissions",classroomId,a.id]})}catch(err){setNotice(examError(err))}finally{setBusy(false)}}
 return <div className="mt-4 space-y-4 border-t border-border pt-4"><p className="whitespace-pre-wrap text-sm">{a.instructions||"No additional instructions."}</p>
 {history.isPending&&<p role="status" className="text-sm">Loading submissions…</p>}{history.isError&&<p role="alert" className="text-sm text-red-700">{examError(history.error)}</p>}
 {canSubmit&&<form onSubmit={e=>void submit(e)} className="space-y-3 rounded-xl bg-secondary p-4"><label className="block text-sm font-semibold">Your answer<textarea rows={4} maxLength={20000} value={answer} className={field} disabled={busy} onChange={e=>{setAnswer(e.target.value);request.current=null}}/></label><label className="block text-sm">Attach file · up to 15 MB<input type="file" className={field} disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);request.current=null}} accept=".pdf,.txt,.md,.zip,.docx,.png,.jpg,.jpeg,.py,.cpp,.c,.h,.java,.js,.ts,.go,.rs"/></label><button className={btn} disabled={busy||history.isPending||history.isError||(!answer.trim()&&!file)}>{busy?"Submitting…":latest?"Submit new version":"Submit assignment"}</button>{latest&&<p className="text-xs text-muted-foreground">A new version retains your earlier submission. Each version is graded separately.</p>}</form>}
 {notice&&<p role="status" className="text-sm">{notice}</p>}
 <h4 className="text-sm font-semibold">{canManage?"Student submissions":"Submission history"}</h4>{history.data?.length===0&&<p className="text-sm text-muted-foreground">No submissions yet.</p>}
 {history.data?.map(s=><SubmissionCard key={s.id} classroomId={classroomId} assignment={a} submission={s} canManage={canManage}/>)}
 </div>;
}
function SubmissionCard({classroomId,assignment:a,submission:s,canManage}:{classroomId:string;assignment:Assignment;submission:Submission;canManage:boolean}){
 const client=useQueryClient();const [points,setPoints]=useState(s.awarded_points??0);const [feedback,setFeedback]=useState(s.feedback);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 return <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">{canManage?`${s.student_name} · `:""}Version {s.version} · {date(s.submitted_at)}{s.late?" · Late":""} · {s.awarded_points===null?"Awaiting grade":`${s.awarded_points}/${a.max_points}`}</summary><div className="mt-3 space-y-3"><p className="whitespace-pre-wrap break-words text-sm">{s.answer}</p>{s.file_name&&<button className={btn} onClick={()=>void assignments.download(classroomId,a.id,s).catch(e=>setError(examError(e)))}>Download {s.file_name}</button>}
 {canManage?<form className="space-y-2" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await assignments.grade(classroomId,a.id,s.id,points,feedback);await client.invalidateQueries({queryKey:["assignment-submissions",classroomId,a.id]})}catch(err){setError(examError(err))}finally{setBusy(false)}}}><label className="block text-sm">Points<input type="number" min={0} max={a.max_points} required className={field} value={points} onChange={e=>setPoints(Number(e.target.value))}/></label><label className="block text-sm">Feedback<textarea rows={2} maxLength={5000} className={field} value={feedback} onChange={e=>setFeedback(e.target.value)}/></label><button disabled={busy} className={btn}>{busy?"Saving…":"Save grade & feedback"}</button></form>:s.feedback&&<p className="whitespace-pre-wrap text-sm">Teacher feedback: {s.feedback}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</div></details>;
}
