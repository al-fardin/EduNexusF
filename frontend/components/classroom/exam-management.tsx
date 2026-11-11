"use client";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {FeedbackTemplates} from "./grading-tools";
import {ReasonDialog} from "@/components/ui/reason-dialog";
import {SavedExamPreview,AnswerReviewSettings} from "./exam-preview";
import { clientId } from "@/lib/client-id";
import { MobileExamOption } from "@/components/classroom/mobile-exam-option";
import { QuestionTesterUpload } from "@/components/classroom/question-tester-upload";
import { TeacherExamMonitoring } from "@/components/classroom/exam-monitoring";
import { prettyWorkspaceAnswer } from "@/services/workspace-phase6";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Edit3, Lock, Save, Send, XCircle } from "lucide-react";
import { examError, examService, type ExamQuestion, type NewExam } from "@/services/exams";
import { examManagement, type StudentGrade } from "@/services/exam-management";

const btn = "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const field = "mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";
function inLocal(iso:string){const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
export function ExamManagement({ classroomId }:{classroomId:string}) {
  const client=useQueryClient();
  const listing=useQuery({queryKey:["classrooms",classroomId,"exams"],queryFn:()=>examService.list(classroomId)});
  const [selected,setSelected]=useState<string|null>(null);
  const [previewPublication,setPreviewPublication]=useState<string[]|null>(null);
  const [editing,setEditing]=useState(false);const [closing,setClosing]=useState(false);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const details=useQuery({queryKey:["manage-exam-details",classroomId,selected],queryFn:()=>examService.teacherExam(classroomId,selected!),enabled:!!selected});
  const grades=useQuery({queryKey:["manage-grades",classroomId,selected],queryFn:()=>examManagement.grades(classroomId,selected!),enabled:!!selected});
  async function refresh(){await Promise.all([client.invalidateQueries({queryKey:["classrooms",classroomId,"exams"]}),client.invalidateQueries({queryKey:["manage-grades",classroomId,selected]}),client.invalidateQueries({queryKey:["published-results",classroomId]}),client.invalidateQueries({queryKey:["classroom-activity",classroomId]})]);}
  async function action(perform:()=>Promise<unknown>, success:string):Promise<boolean>{setBusy(true);setNotice("");try{await perform();setNotice(success);await refresh();return true}catch(e){setNotice(examError(e));return false}finally{setBusy(false)}}
  return <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 text-foreground shadow-sm">
    <ReasonDialog open={closing} onOpenChange={setClosing} title="Close exam now?" description="Students will no longer be able to save or submit changes." onConfirm={async reason=>{if(!selected)return;await examManagement.close(classroomId,selected,reason);await refresh();setNotice("Exam closed.");}}/>
    <div><h3 className="text-xl font-bold">Teacher exam management</h3><p className="mt-1 text-sm text-muted-foreground"></p></div>
    {listing.isPending && <div className="h-16 animate-pulse rounded-2xl bg-secondary"/>}
    <label className="block text-sm font-semibold">Select exam<select className={field} value={selected??""} onChange={e=>{setSelected(e.target.value||null);setEditing(false);setNotice("")}}><option value="">Choose an exam</option>{listing.data?.map(e=><option value={e.id} key={e.id}>{e.title}</option>)}</select></label>
    {!!selected && <div className="space-y-4">
      {details.isPending && <div className="h-28 animate-pulse rounded-2xl bg-secondary"/>}
      {details.data && <>
        <div className="flex flex-wrap items-center gap-2"><button className={btn} disabled={busy || (grades.data?.attempts.length ?? 0) > 0} onClick={()=>setEditing(x=>!x)}><Edit3 size={15}/> {editing?"Cancel edit":"Edit exam & questions"}</button>{(grades.data?.attempts.length ?? 0)>0 && <span className="text-xs text-muted-foreground">Questions locked: students have already started.</span>}<button className={btn} disabled={busy||details.data.exam.status!=="published"} onClick={()=>setClosing(true)}><Lock size={15}/> Close exam now</button></div>
        <div className="flex flex-wrap gap-2"><SavedExamPreview classroomId={classroomId} examId={selected}/></div><AnswerReviewSettings classroomId={classroomId} examId={selected}/>{editing && <ExamEditForm key={selected} classroomId={classroomId} detail={details.data} onSave={payload=>action(()=>examManagement.edit(classroomId,selected,payload),"Exam updated. Existing exam attempts are protected.").then(ok=>{if(ok){setEditing(false);void client.invalidateQueries({queryKey:["manage-exam-details",classroomId,selected]})}})} busy={busy}/>}
      </>}
      <TeacherExamMonitoring classroomId={classroomId} examId={selected} attemptCount={grades.data?.attempts.length??0}/>
      <div className="border-t border-border pt-4"><h4 className="mb-2 flex items-center gap-2 font-bold"><ClipboardCheck size={18}/> Grading & publishing</h4><p className="mb-3 text-xs text-muted-foreground">MCQ marks are calculated automatically. Theory/coding answers need teacher marks before publication. Students with no submission are eligible only after the deadline.</p>
        {grades.isPending && <div className="space-y-2">{[1,2].map(i=><div className="h-16 animate-pulse rounded-xl bg-secondary" key={i}/>)}</div>}
        {grades.isError && <p role="alert" className="text-sm text-destructive">{examError(grades.error)}</p>}
        {grades.data && <><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{grades.data.attempts.length} attempts · maximum {grades.data.max_points} pts</span><button className={btn} disabled={busy} onClick={()=>setPreviewPublication([])}><Send size={15}/> Publish all graded results</button></div>
        <div className="space-y-3">{grades.data.attempts.map(student=><StudentMarkCard key={student.id} classId={classroomId} student={student} questions={grades.data!.questions} busy={busy} onMark={(q,score,feedback,reason)=>action(()=>examManagement.mark(classroomId,selected,student.id,q,score,feedback,reason),"Marks saved as draft.")} onPublish={async()=>setPreviewPublication([student.id])} onRetract={()=>action(()=>examManagement.retract(classroomId,selected,[student.id]),"Result unpublished. You may edit marks and republish.")}/>)}</div></>}
      </div>
    </div>}
    <Dialog open={previewPublication!==null} onOpenChange={open=>{if(!open&&!busy)setPreviewPublication(null);}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Result publication preview</DialogTitle><DialogDescription>Students see published marks. These totals are based on the currently saved grades.</DialogDescription></DialogHeader>{grades.data?.attempts.filter(a=>a.eligible&&a.ready&&!a.published&&(!previewPublication?.length||previewPublication.includes(a.id))).map(a=><div key={a.id} className="flex justify-between gap-3 rounded-xl border border-border p-3 text-sm"><span>{a.student_name}</span><strong>{a.total}/{grades.data?.max_points}</strong></div>)}<div className="flex justify-end gap-2"><button className={btn} disabled={busy} onClick={()=>setPreviewPublication(null)}>Back</button><button className={btn} disabled={busy||!grades.data?.attempts.some(a=>a.eligible&&a.ready&&!a.published&&(!previewPublication?.length||previewPublication.includes(a.id)))} onClick={()=>{if(!selected)return;void action(()=>examManagement.publishResults(classroomId,selected,previewPublication??[]),"Results published.").then(ok=>{if(ok)setPreviewPublication(null);});}}>Confirm publication</button></div></DialogContent></Dialog>
    {notice && <p className="rounded-xl bg-secondary px-4 py-3 text-sm" role="status">{notice}</p>}
  </section>;
}
function StudentMarkCard({classId,student,questions,busy,onMark,onPublish,onRetract}:{classId:string;student:StudentGrade;questions:ExamQuestion[];busy:boolean;onMark:(q:string,score:number,feedback:string,reason:string)=>Promise<unknown>;onPublish:()=>Promise<unknown>;onRetract:()=>Promise<unknown>}) {
  const [expanded,setExpanded]=useState(false);
  return <article className="rounded-2xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><button className="text-left text-sm font-semibold" onClick={()=>setExpanded(x=>!x)}>{student.student_name} · {student.total} pts · {student.published?"Published":student.ready?"Ready for review":"Needs marking"} {expanded?"−":"+"}</button><div className="flex gap-2">{student.published?<button className={btn} disabled={busy} onClick={()=>void onRetract()}><XCircle size={14}/> Retract</button>:<button className={btn} disabled={busy||!student.eligible||!student.ready} onClick={()=>void onPublish()}><Send size={14}/> Publish</button>}</div></div>
    {expanded && <div className="mt-4 space-y-3">{questions.map(q=><MarkQuestion classId={classId} key={q.id} q={q} student={student} disabled={busy||student.published||!student.eligible} onMark={onMark}/>)}<p className="text-xs text-muted-foreground">Question marks stay private until publication. Retract before changing published marks.</p></div>}
  </article>;
}
function MarkQuestion({classId,q,student,disabled,onMark}:{classId:string;q:ExamQuestion;student:StudentGrade;disabled:boolean;onMark:(q:string,score:number,feedback:string,reason:string)=>Promise<unknown>}) {
  const saved=student.marks.find(m=>m.question_id===q.id);
  const [points,setPoints]=useState(saved?.points??0);const [feedback,setFeedback]=useState(saved?.feedback??"");const [reason,setReason]=useState("");
  return <div className="rounded-xl bg-secondary p-3 text-sm"><p className="font-semibold">{q.prompt} <span className="text-muted-foreground">({q.kind}, max {q.points})</span></p><pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-card p-3 font-mono text-xs">Answer: {q.kind==="mcq" ? (q.options?.[Number(student.answers[q.id])] ?? "Not answered") : (prettyWorkspaceAnswer(student.answers[q.id] || "Not answered"))}</pre><div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr_auto]"><label>Marks<input type="number" min={0} max={q.points} value={points} onChange={e=>setPoints(Number(e.target.value))} className={field}/></label><label>Feedback<input value={feedback} maxLength={5000} onChange={e=>setFeedback(e.target.value)} className={field} placeholder="Optional feedback"/></label><button className={`${btn} self-end`} disabled={disabled||!!saved&&reason.trim().length<3} onClick={()=>void onMark(q.id,points,feedback,reason)}><Save size={15}/> Save</button></div><FeedbackTemplates classId={classId} text={feedback} onUse={text=>setFeedback(old=>old?old+"\n"+text:text)}/><label className="mt-2 block">Reason for grade change<input maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className={field}/></label><p className="mt-1 text-xs text-muted-foreground">{saved?`Recorded: ${saved.points}/${q.points} (${saved.grader})`:q.kind==="mcq"?"Automatic marking pending":"Not graded yet"}</p></div>;
}
function ExamEditForm({classroomId,detail,onSave,busy}:{classroomId:string;detail:{exam:{title:string;description:string;starts_at:string;ends_at:string;duration_minutes:number;allow_mobile_mcq?:boolean};questions:ExamQuestion[]};onSave:(form:NewExam)=>Promise<unknown>;busy:boolean}) {
  const [title,setTitle]=useState(detail.exam.title);const [description,setDescription]=useState(detail.exam.description);
  const [starts,setStarts]=useState(inLocal(detail.exam.starts_at));const [ends,setEnds]=useState(inLocal(detail.exam.ends_at));const [duration,setDuration]=useState(detail.exam.duration_minutes);
  const [uploads,setUploads]=useState(0);const [reason,setReason]=useState("");
  const [questions,setQuestions]=useState(detail.questions);
  const [allowPhone,setAllowPhone]=useState(detail.exam.allow_mobile_mcq??false);
  const updateQ=(i:number,patch:Partial<ExamQuestion>)=>setQuestions(list=>list.map((q,j)=>i===j?{...q,...patch}:q));
  return <form onSubmit={e=>{e.preventDefault();if(uploads>0||busy)return;void onSave({reason,allow_mobile_mcq:allowPhone&&questions.every(q=>q.kind==="mcq"),title,description,starts_at:new Date(starts).toISOString(),ends_at:new Date(ends).toISOString(),duration_minutes:duration,questions})}} className="space-y-3 rounded-2xl bg-secondary p-4">
    <p className="text-xs text-muted-foreground">Full editing is allowed until a student starts. Once attempts exist, the backend prevents modifications to protect fairness.</p>
    <label className="block text-sm">Title<input value={title} onChange={e=>setTitle(e.target.value)} className={field} required/></label><label className="block text-sm">Instructions<textarea value={description} onChange={e=>setDescription(e.target.value)} className={field}/></label>
    <div className="grid gap-2 sm:grid-cols-3"><label className="text-sm">Start<input type="datetime-local" className={field} value={starts} onChange={e=>setStarts(e.target.value)}/></label><label className="text-sm">End<input type="datetime-local" className={field} value={ends} onChange={e=>setEnds(e.target.value)}/></label><label className="text-sm">Duration<input type="number" min={1} max={240} className={field} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label></div>
    <label className="block text-sm">Reason for changes<input required minLength={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className={field}/></label>
    <MobileExamOption enabled={allowPhone} onChange={setAllowPhone} mcqOnly={questions.every(q=>q.kind==="mcq")}/>
    {questions.map((q,i)=><div className="space-y-2 rounded-xl border border-border bg-card p-3" key={q.id}><div className="flex items-center justify-between gap-2"><strong className="text-xs">Question {i+1}</strong><button type="button" disabled={questions.length<=1} className={btn} onClick={()=>setQuestions(qs=>qs.filter((_,idx)=>idx!==i))}>Remove</button></div><label className="block text-sm font-semibold">Question {i+1} · {q.kind} · {q.points} points<textarea value={q.prompt} onChange={e=>updateQ(i,{prompt:e.target.value})} className={field}/></label><label className="block text-sm">Points<input type="number" min={1} max={100} value={q.points} onChange={e=>updateQ(i,{points:Number(e.target.value)})} className={field}/></label><label className="block text-sm">Answer explanation<textarea className={field} maxLength={4000} rows={2} value={q.explanation??""} onChange={e=>updateQ(i,{explanation:e.target.value})}/></label>{q.kind==="mcq"?<div>{q.options?.map((value,j)=><label key={j} className="flex items-center gap-2 py-1"><input type="radio" name={q.id} checked={q.correct_option===j} onChange={()=>updateQ(i,{correct_option:j})}/><input className={field} value={value} onChange={e=>updateQ(i,{options:q.options?.map((o,k)=>j===k?e.target.value:o)})}/></label>)}</div>:<label className="block text-sm">Marking key<textarea value={q.sample_answer??""} onChange={e=>updateQ(i,{sample_answer:e.target.value})} className={field}/></label>}{q.kind==="coding"&&<QuestionTesterUpload classroomId={classroomId} tester={q.tester} disabled={busy} onBusyChange={delta=>setUploads(n=>n+delta)} onChange={tester=>setQuestions(list=>list.map(item=>item.id===q.id?{...item,tester}:item))}/>}</div>)}
    <div className="flex flex-wrap gap-2"><button type="button" className={btn} disabled={questions.length>=40} onClick={()=>setQuestions(qs=>[...qs,{id:clientId(),kind:"mcq",prompt:"New question",points:10,options:["Option A","Option B"],correct_option:0}])}>Add question</button><button type="submit" className={btn} disabled={busy || uploads>0}><Save size={15}/> Save exam changes</button></div>
  </form>;
}
