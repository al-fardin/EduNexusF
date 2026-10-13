"use client";
import { StudentDesktopPair } from "@/components/classroom/desktop-monitoring";
import { ExamEntryGate } from "@/components/classroom/exam-entry-gate";
import { StudentExamMonitor } from "@/components/classroom/exam-monitoring";
import { TeacherSubmissionExplorer } from "@/components/classroom/teacher-submission-explorer";
import { CodingWorkbench } from "@/components/classroom/coding-workbench";
import { codingService } from "@/services/coding";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock3, Plus, Send, ChevronDown, ChevronUp, ClipboardList, CheckCircle2, Play, Save, Trash2, Eye, LockKeyhole, LoaderCircle, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { examError, examService, type ExamQuestion, type ExamInfo, type ExamSubmission, type LiveExam, type NewExam, type QuestionKind } from "@/services/exams";

type Props = { classroomId: string; canManage: boolean };
const field = "w-full rounded-[19px_10px_17px_13px] border border-[#cbd2c5] bg-[#f3f1ea] px-4 py-3 text-[#171b18] outline-none focus:ring-2 focus:ring-[#b6c1b2]";
const primary = "inline-flex items-center justify-center gap-2 rounded-[21px_10px_18px_12px] bg-[#2b342c] px-5 py-3 text-sm font-semibold text-[#f3f1ea] transition hover:bg-[#536058] disabled:opacity-50";
const outline = "inline-flex items-center justify-center gap-2 rounded-[19px_10px_17px_12px] border border-[#cbd2c5] bg-[#f3f1ea] px-4 py-2.5 text-sm font-semibold text-[#2b342c] transition hover:bg-[#e9ede5] disabled:opacity-50";
const panel = "rounded-[30px_14px_27px_18px] border border-[#dfe4d9] bg-[#fbfaf6] p-5 shadow-[0_10px_30px_rgba(56,40,29,0.06)] sm:p-6";
function dateLabel(date: string) { return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
function localDate(date: Date) { const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
function newQuestion(kind: QuestionKind = "mcq"): ExamQuestion {
  return { id: crypto.randomUUID(), kind, prompt: "", points: 10, options: ["", ""], correct_option: 0, sample_answer: "", language: "python" };
}
export function ExamBoard({ classroomId, canManage }: Props) {
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  const [entryExam, setEntryExam] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["classrooms", classroomId, "exams"], queryFn: () => examService.list(classroomId), enabled: !taking });
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now()); const initial = window.setTimeout(tick, 0); const timer = window.setInterval(tick, 15000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, []);
  const publish = useMutation({ mutationFn: (id: string) => examService.publish(classroomId, id), onSuccess: () => { setNotice("Exam published. Students can join during its scheduled window."); void client.invalidateQueries({queryKey:["classrooms",classroomId,"exams"]}); } });
  // Keep an active student exam as a focused view; never render the exam list underneath.
  if (entryExam && !canManage) {
    return <div className="en-exam-view text-[#171B18]"><ExamEntryGate classroomId={classroomId} examId={entryExam} onEnter={()=>{const id=entryExam;setEntryExam(null);setTaking(id);}} onExit={()=>setEntryExam(null)}/></div>;
  }
  if (taking && !canManage) {
    return <div className="en-exam-view text-[#171b18]">
      <ExamTake classroomId={classroomId} examId={taking} onClose={() => {
        setTaking(null);
        void client.invalidateQueries({ queryKey: ["classrooms", classroomId, "exams"] });
      }} />
    </div>;
  }
  return <div className="space-y-5 text-[#171b18]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Live examinations</h2><p className="mt-1 text-sm text-[#536058]">MCQ, written and coding exams. Saved securely with classroom-level permissions.</p></div>
      {canManage && <button type="button" className={primary} onClick={() => { setCreating(v=>!v); setNotice(""); }}><Plus size={17} /> {creating ? "Close editor" : "Create exam"}</button>}
    </div>
    {notice && <div role="status" className="rounded-xl bg-[#e9ede5] px-4 py-3 text-sm text-[#5f7358]">{notice}</div>}
    {creating && canManage && <ExamCreator classroomId={classroomId} onClose={() => {setCreating(false);void client.invalidateQueries({queryKey:["classrooms",classroomId,"exams"]});}} />}

    {reviewing && canManage && <TeacherReview classroomId={classroomId} examId={reviewing} onClose={()=>setReviewing(null)}/>}
    {list.isPending && <ExamListSkeleton />}
    {list.isError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{examError(list.error)} <button className="underline" onClick={()=>void list.refetch()}>Retry</button></div>}
    {list.data && list.data.length===0 && <div className={panel}><ClipboardList className="mb-3 text-[#6f756f]"/><h3 className="font-bold">No exams yet</h3><p className="mt-1 text-sm text-[#536058]">{canManage ? "Create your first exam; it starts as a private draft." : "Your teacher has not published any exams yet."}</p></div>}
    <div className="grid gap-4 lg:grid-cols-2">{list.data?.map(exam=><ExamCard key={exam.id} exam={exam} canManage={canManage} onPublish={()=>{if(window.confirm("Publish this exam for enrolled students? Questions can no longer be edited."))publish.mutate(exam.id);}} onTake={()=>{setEntryExam(exam.id);setReviewing(null);}} onReview={()=>{setReviewing(reviewing===exam.id?null:exam.id);setTaking(null);}} busy={publish.isPending && publish.variables === exam.id} now={now}/>)}</div>
    {publish.isError && <p role="alert" className="text-sm text-red-700">{examError(publish.error)}</p>}
    <p className="text-xs leading-5 text-[#6f756f]">Phase 3: sandboxed code execution and teacher-only activity reviews. AI marking and published results are planned for a later phase.</p>
  </div>;
}
function ExamCard({exam,canManage,onPublish,onTake,onReview,busy,now}: {exam:ExamInfo;canManage:boolean;onPublish:()=>void;onTake:()=>void;onReview:()=>void;busy:boolean;now:number}) {
  const open=exam.status==="published" && now>=Date.parse(exam.starts_at) && now<Date.parse(exam.ends_at);
  const waiting=now<Date.parse(exam.starts_at);const ended=now>=Date.parse(exam.ends_at);
  return <article className={panel}>
    <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-full bg-[#e9ede5] px-3 py-1 text-xs font-bold capitalize text-[#2b342c]">{exam.status}</span><span className="text-xs text-[#6f756f]">{exam.question_count} questions</span></div>
    <h3 className="text-lg font-bold">{exam.title}</h3><p className="mt-2 text-sm text-[#6f756f]">{exam.description || "Classroom assessment"}</p>
    <div className="mt-4 space-y-1 text-xs text-[#536058]"><p>Opens: {dateLabel(exam.starts_at)}</p><p>Closes: {dateLabel(exam.ends_at)}</p><p>Time limit: {exam.duration_minutes} minutes after joining</p></div>
    <div className="mt-4 flex flex-wrap items-center gap-2">{canManage ? <><button type="button" className={outline} onClick={onReview}><Eye size={15}/> View submissions</button>{exam.status==="draft" && <button type="button" className={primary} onClick={onPublish} disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>} {busy ? "Publishing…" : "Publish exam"}</button>}</> : <button type="button" className={primary} onClick={onTake} disabled={!open}><Play size={15}/>{open?"Join / Resume":"Exam unavailable"}</button>}
      {!canManage && <span className="text-xs text-[#6f756f]">{ended?"Window ended":waiting?"Not started":"Open now"}</span>}
    </div>
  </article>;
}
function ExamCreator({classroomId,onClose}:{classroomId:string;onClose:()=>void}) {
  const [title,setTitle]=useState("");const [description,setDescription]=useState("");
  const [starts,setStarts]=useState(()=>localDate(new Date(Date.now()+5*60000)));
  const [ends,setEnds]=useState(()=>localDate(new Date(Date.now()+125*60000)));
  const [duration,setDuration]=useState(60);
  const [questions,setQuestions]=useState<ExamQuestion[]>([newQuestion()]);
  const mutation=useMutation({mutationFn:(payload:NewExam)=>examService.create(classroomId,payload),onSuccess:onClose});
  function updateQuestion(index:number,patch:Partial<ExamQuestion>) {setQuestions(current=>current.map((q,i)=>i===index?{...q,...patch}:q));}
  function create(){
    const payload:NewExam={title:title.trim(),description:description.trim(),starts_at:new Date(starts).toISOString(),ends_at:new Date(ends).toISOString(),duration_minutes:duration,questions:questions.map(q=>q.kind==="mcq"?{...q,options:q.options?.map(o=>o.trim()),sample_answer:""}:{...q,options:[],correct_option:undefined})};
    mutation.mutate(payload);
  }
  return <section className={panel}><h3 className="mb-4 text-lg font-bold">Build an exam <span className="ml-2 text-sm font-normal text-[#6f756f]">Private draft</span></h3>
    <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Exam title<input className={field} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Midterm practical"/></label>
      <label className="space-y-2 text-sm font-semibold">Duration (minutes)<input className={field} type="number" min={1} max={240} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>
      <label className="space-y-2 text-sm font-semibold">Start (local time)<input className={field} type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></label>
      <label className="space-y-2 text-sm font-semibold">End (local time)<input className={field} type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></label>
    </div><label className="mt-4 block space-y-2 text-sm font-semibold">Instructions<textarea className={field} value={description} rows={2} maxLength={5000} onChange={e=>setDescription(e.target.value)} placeholder="Allowed tools, exam rules, grading…"/></label>
    <div className="mt-6 flex items-center justify-between gap-2"><h4 className="font-bold">Questions ({questions.length}/40)</h4><button type="button" className={outline} disabled={questions.length>=40} onClick={()=>setQuestions(q=>[...q,newQuestion()])}><Plus size={16}/> Add question</button></div>
    <div className="mt-4 space-y-4">{questions.map((q,i)=><section key={q.id} className="rounded-[22px_10px_20px_12px] border border-[#d9ddd4] bg-[#f3f1ea] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong>Question {i+1}</strong><button type="button" className="text-xs font-semibold text-[#b34450]" disabled={questions.length===1} onClick={()=>setQuestions(current=>current.filter((_,n)=>i!==n))}><Trash2 size={15}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Type<select className={field} value={q.kind} onChange={e=>{const kind=e.target.value as QuestionKind;updateQuestion(i,{kind,options:kind==="mcq"?["",""]:[],correct_option:kind==="mcq"?0:undefined});}}><option value="mcq">MCQ</option><option value="theory">Theory</option><option value="coding">Coding</option></select></label>
        <label className="space-y-1 text-sm">Points<input className={field} type="number" min={1} max={100} value={q.points} onChange={e=>updateQuestion(i,{points:Number(e.target.value)})}/></label></div>
      <label className="mt-3 block space-y-1 text-sm">Question / problem statement<textarea className={field} rows={3} maxLength={10000} value={q.prompt} onChange={e=>updateQuestion(i,{prompt:e.target.value})}/></label>
      {q.kind==="mcq"?<div className="mt-3 space-y-2"><p className="text-xs text-[#536058]">Choose the correct answer (teacher only).</p>{q.options?.map((option,j)=><div key={j} className="flex items-center gap-2"><input aria-label={`Correct option ${j+1}`} type="radio" name={`correct-${q.id}`} checked={q.correct_option===j} onChange={()=>updateQuestion(i,{correct_option:j})}/><input aria-label={`Option ${j+1}`} className={field} value={option} onChange={e=>updateQuestion(i,{options:q.options?.map((o,k)=>k===j?e.target.value:o)})}/>{(q.options?.length??0)>2&&<button type="button" className="text-[#b34450]" onClick={()=>updateQuestion(i,{options:q.options?.filter((_,k)=>k!==j),correct_option:0})}><Trash2 size={16}/></button>}</div>)}<button type="button" className={outline} disabled={(q.options?.length??0)>=6} onClick={()=>updateQuestion(i,{options:[...(q.options??[]),""]})}>Add option</button></div>:
        <div className="mt-3 grid gap-3"><label className="space-y-1 text-sm">Reference solution / marking notes (teacher only)<textarea className={field} rows={3} value={q.sample_answer??""} maxLength={15000} onChange={e=>updateQuestion(i,{sample_answer:e.target.value})}/></label>{q.kind==="coding"&&<label className="space-y-1 text-sm">Expected language<select className={field} value={q.language||"python"} onChange={e=>updateQuestion(i,{language:e.target.value})}><option value="python">Python</option><option value="go">Go</option><option value="cpp">C++</option><option value="java">Java</option><option value="javascript">JavaScript</option><option value="c">C</option><option value="typescript">TypeScript</option><option value="rust">Rust</option><option value="ruby">Ruby</option><option value="php">PHP</option><option value="other">Other (no compiler)</option></select></label>}</div>}
    </section>)}</div>
    {mutation.isError&&<p className="mt-4 text-sm text-[#b34450]" role="alert">{examError(mutation.error)}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className={primary} disabled={mutation.isPending} onClick={()=>{if(!title.trim()||!starts||!ends){window.alert("Provide a title, start and end time.");return;}create();}}>{mutation.isPending ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {mutation.isPending?"Saving draft…":"Save private draft"}</button><button type="button" className={outline} disabled={mutation.isPending} onClick={onClose}>Cancel</button></div>
  </section>;
}
function TeacherReview({classroomId,examId,onClose}:{classroomId:string;examId:string;onClose:()=>void}) {
  return <TeacherSubmissionExplorer classroomId={classroomId} examId={examId} onClose={onClose} />;
}
function ExamTake({classroomId,examId,onClose}:{classroomId:string;examId:string;onClose:()=>void}) {
  const [live,setLive]=useState<LiveExam|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [error,setError]=useState("");const [saving,setSaving]=useState(false);const [saved,setSaved]=useState("");
  const [now,setNow]=useState(0);const [submitted,setSubmitted]=useState(false);
  const dirty=useRef(false);const answersRef=useRef(answers);const savingRef=useRef(false);const revision=useRef(0);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;examService.start(classroomId,examId).then(data=>{if(mounted){setLive(data);setAnswers(data.attempt.answers);answersRef.current=data.attempt.answers;setSubmitted(data.attempt.status==="submitted");}}).catch(e=>{if(mounted)setError(examError(e));}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false};},[classroomId,examId]);
  useEffect(()=>{const tick=()=>setNow(Date.now());const initial=window.setTimeout(tick,0);const timer=window.setInterval(tick,1000);return()=>{window.clearTimeout(initial);window.clearInterval(timer);};},[]);
  useEffect(()=>{
    if(!live || submitted)return;
    const changed=()=>{
      const kind=document.visibilityState==="hidden"?"visibility_hidden":"visibility_visible";
      void codingService.activity(classroomId,examId,[{kind,question_id:"",magnitude:0}]).catch(()=>undefined);
    };
    document.addEventListener("visibilitychange",changed);
    return()=>document.removeEventListener("visibilitychange",changed);
  },[classroomId,examId,live,submitted]);
  // Save modified answers every 5 seconds, in addition to the Save button.
  useEffect(()=>{if(!live||submitted)return;const timer=window.setInterval(async()=>{if(!dirty.current||savingRef.current||Date.now()>=Date.parse(live.attempt.expires_at))return; savingRef.current=true;setSaving(true);const sentRevision=revision.current;try{await examService.save(classroomId,examId,answersRef.current);if(revision.current===sentRevision){dirty.current=false;setSaved("Saved at "+new Date().toLocaleTimeString());}}catch(e){setError(examError(e));}finally{savingRef.current=false;setSaving(false);}},5000);return()=>window.clearInterval(timer);},[classroomId,examId,live,submitted]);
  function change(id:string,value:string){const next={...answersRef.current,[id]:value};answersRef.current=next;setAnswers(next);dirty.current=true;revision.current+=1;setSaved("Unsaved changes");}
  async function save(){
    if(!live||savingRef.current||submitted)return;
    savingRef.current=true;setSaving(true);setError("");const sentRevision=revision.current;
    try{await examService.save(classroomId,examId,answersRef.current);if(revision.current===sentRevision){dirty.current=false;setSaved("Saved at "+new Date().toLocaleTimeString());}}
    catch(e){setError(examError(e));}
    finally{savingRef.current=false;setSaving(false);}
  }
  async function submit(){
    if(!live||savingRef.current||submitted||!window.confirm("Submit your final answers? You cannot change them afterward."))return;
    savingRef.current=true;setSaving(true);setSaved("Submitting final answers…");setError("");
    try{await examService.submit(classroomId,examId,answersRef.current);setSubmitted(true);dirty.current=false;setSaved("Submitted successfully");}
    catch(e){setError(examError(e));setSaved("Submission failed — you can retry.");}
    finally{savingRef.current=false;setSaving(false);}
  }
  const until=live?Math.min(Date.parse(live.attempt.expires_at),Date.parse(live.exam.ends_at)):0;
  const left=Math.max(0,Math.floor((until-now)/1000));const timedOut=Boolean(live)&&left<=0;
  return <section className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{live?.exam.title??"Exam session"}</h3><button className={outline} onClick={onClose}><ArrowLeft size={16}/> Back to exams</button></div>
    {(loading||Boolean(live&&!now))&&<ExamSessionSkeleton />}{error&&<p className="mb-4 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#b34450]" role="alert">{error}</p>}
    {live&&now>0&&<><StudentDesktopPair classroomId={classroomId} examId={examId}/><StudentExamMonitor classroomId={classroomId} examId={examId} attemptId={live.attempt.id} expiresAt={live.attempt.expires_at} active={!submitted&&!timedOut}/><div className="mb-5 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-[#e9ede5] px-4 py-2 text-sm font-bold"><Clock3 size={16}/>{String(Math.floor(left/3600)).padStart(2,"0")}:{String(Math.floor(left/60)%60).padStart(2,"0")}:{String(left%60).padStart(2,"0")}</span><span className="text-xs text-[#6f756f]">Deadline is enforced by server · {dateLabel(live.attempt.expires_at)}</span></div>
      {submitted?<div className="rounded-xl bg-[#e9ede5] p-5"><CheckCircle2 className="mb-2 text-[#5f7358]"/><p className="font-semibold">Your exam has been submitted.</p><p className="text-sm text-[#536058]">Teacher will review answers. Results are not available yet.</p></div>:timedOut?<div className="rounded-xl bg-[#e9ede5] p-5"><LockKeyhole className="mb-2"/><p className="font-semibold">Time has expired.</p><p className="mt-1 text-sm">You cannot change or submit new answers. Any answers saved before the deadline are retained for teacher review.</p></div>:<>
      <div className="space-y-4">{live.questions.map((q,i)=><div key={q.id} className="rounded-[22px_10px_18px_12px] border border-[#d9ddd4] bg-[#f3f1ea] p-4"><div className="mb-3 flex items-start justify-between gap-4"><p className="font-semibold">{i+1}. {q.prompt}</p><span className="shrink-0 rounded-lg bg-[#e9ede5] px-2 py-1 text-xs">{q.points} pts</span></div>
        {q.kind==="mcq"?<div className="space-y-2">{q.options?.map((o,j)=><label key={j} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#dfe4d9] px-3 py-2 text-sm"><input type="radio" name={q.id} checked={answers[q.id]===String(j)} onChange={()=>change(q.id,String(j))}/>{o}</label>)}</div>:<><p className="mb-2 text-xs font-medium text-[#536058]">{q.kind==="coding"?`Code answer (${q.language||"text"}). Code can be run in the isolated compiler when enabled.`:"Written response"}</p>{q.kind==="coding"?<CodingWorkbench classroomId={classroomId} examId={examId} questionId={q.id} language={q.language||"other"} code={answers[q.id]??""} onChange={(value)=>change(q.id,value)} />:<textarea value={answers[q.id]??""} onChange={e=>change(q.id,e.target.value)} maxLength={8000} spellCheck rows={6} className={field} placeholder={q.kind==="coding"?"Write your solution here…":"Type your answer…"}/>}</>}
      </div>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button className={outline} disabled={saving} onClick={()=>void save()}>{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Save size={17}/>} {saving?"Saving…":"Save progress"}</button><button className={primary} disabled={saving} onClick={()=>void submit()}>{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Send size={17}/>} {saving ? "Processing…" : "Submit final answers"}</button><span className="text-xs text-[#6f756f]" role="status">{saved}</span></div>
      </>}
    </>}
  </section>;
}

/** Lightweight placeholders while real API requests are in flight. */
function ExamListSkeleton({small=false}:{small?:boolean}) {
  return <div className={`grid gap-4 ${small ? "" : "lg:grid-cols-2"}`} role="status" aria-label="Loading exams">
    {Array.from({length:small?2:4},(_,i)=><div key={i} className={panel}>
      <div className="en-skeleton mb-5 h-5 w-24 rounded-full" />
      <div className="en-skeleton mb-3 h-6 w-3/5 rounded-md" />
      <div className="en-skeleton mb-4 h-4 w-5/6 rounded-md" />
      <div className="en-skeleton mb-2 h-3 w-1/2 rounded-md" />
      <div className="en-skeleton mt-7 h-10 w-40 rounded-xl" />
    </div>)}
    <span className="sr-only">Loading classroom examinations…</span>
  </div>;
}
function ExamSessionSkeleton() {
  return <div className="space-y-4" role="status" aria-label="Joining exam">
    <div className="flex items-center gap-3"><LoaderCircle size={18} className="animate-spin text-[#2b342c]"/><span className="text-sm text-[#79695d]">Preparing your secure exam session…</span></div>
    <div className="en-skeleton h-10 w-36 rounded-xl"/>
    {Array.from({length:2},(_,i)=><div key={i} className="rounded-[24px] border border-[#dfe4d9] bg-[#f3f1ea] p-5">
      <div className="en-skeleton h-5 w-2/3 rounded-lg"/><div className="en-skeleton mt-5 h-12 w-full rounded-xl"/><div className="en-skeleton mt-3 h-12 w-full rounded-xl"/>
    </div>)}
    <span className="sr-only">Exam details are loading…</span>
  </div>;
}
