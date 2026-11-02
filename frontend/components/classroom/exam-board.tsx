"use client";
import { clientId } from "@/lib/client-id";
import { MobileExamOption } from "@/components/classroom/mobile-exam-option";
import { useAuthStore } from "@/store/auth-store";
import { readExamDraft, saveExamDraft, removeExamDraft, sameAnswers } from "@/lib/exam-drafts";
import { StudentDesktopPair } from "@/components/classroom/desktop-monitoring";
import { ExamEntryGate } from "@/components/classroom/exam-entry-gate";
import { StudentExamMonitor } from "@/components/classroom/exam-monitoring";
import { TeacherSubmissionExplorer } from "@/components/classroom/teacher-submission-explorer";
import { QuestionBank, SaveBankQuestion } from "@/components/classroom/question-bank";
import { QuestionTesterUpload } from "@/components/classroom/question-tester-upload";
import { CodingWorkbench } from "@/components/classroom/coding-workbench";
import { codingService } from "@/services/coding";
import { clearActiveExam, readActiveExam, rememberActiveExam } from "@/lib/exam-resume";

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
  return { id: clientId(), kind, prompt: "", points: 10, options: ["", ""], correct_option: 0, sample_answer: "", language: "python" };
}
export function ExamBoard({ classroomId, canManage }: Props) {
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  const [entryExam, setEntryExam] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["classrooms", classroomId, "exams"], queryFn: () => examService.list(classroomId), enabled: !taking });
  const activeAttempts = useQuery({queryKey:["active-exams",classroomId],queryFn:()=>examService.active(classroomId),enabled:!canManage&&!taking&&!entryExam,refetchInterval:30000});
  const [notice, setNotice] = useState("");
  const [restoreState, setRestoreState] = useState<"checking" | "ready" | "error">("checking");
  const [restoreError, setRestoreError] = useState("");
  const [retryRestore, setRetryRestore] = useState(0);
  // Restore only this browser tab's classroom-scoped exam selection.
  // Validate active attempts with the server before reopening the answer editor.
  useEffect(() => {
    if (canManage) { setRestoreState("ready"); return; }
    const saved = readActiveExam(classroomId);
    if (!saved) { setRestoreState("ready"); return; }
    if (saved.phase === "entry") {
      setEntryExam(saved.examId);
      setRestoreState("ready");
      return;
    }
    let cancelled = false;
    setRestoreState("checking");
    setRestoreError("");
    void examService.attempt(classroomId, saved.examId).then((data) => {
      if (cancelled) return;
      const expires = Math.min(Date.parse(data.attempt.expires_at), Date.parse(data.exam.ends_at));
      if (data.attempt.status === "in_progress" && Number.isFinite(expires) && expires > Date.now()) {
        setTaking(saved.examId);
      } else {
        clearActiveExam(classroomId, saved.examId);
      }
      setRestoreState("ready");
    }).catch((err: unknown) => {
      if (cancelled) return;
      // The initial POST /start may not have completed before the refresh.
      // Re-enter the consent gate instead of initiating a new attempt automatically.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        rememberActiveExam(classroomId, saved.examId, "entry");
        setEntryExam(saved.examId);
        setRestoreState("ready");
      } else {
        // Keep sessionStorage on temporary network/auth failures for a later retry.
        setRestoreError(examError(err));
        setRestoreState("error");
      }
    });
    return () => { cancelled = true; };
  }, [classroomId, canManage, retryRestore]);
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now()); const initial = window.setTimeout(tick, 0); const timer = window.setInterval(tick, 15000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, []);
  const publish = useMutation({ mutationFn: (id: string) => examService.publish(classroomId, id), onSuccess: () => { setNotice("Exam published. Students can join during its scheduled window."); void client.invalidateQueries({queryKey:["classrooms",classroomId,"exams"]}); } });
  // Do not flash Stream / exam list while checking a persisted attempt.
  if (!canManage && restoreState === "checking") {
    return <div className={panel} role="status"><LoaderCircle size={18} className="mr-2 inline animate-spin"/> Restoring your exam session…</div>;
  }
  if (!canManage && restoreState === "error") {
    return <div className={panel} role="alert">
      <h3 className="text-lg font-bold">Unable to verify the previous exam session</h3>
      <p className="mt-2 text-sm">{restoreError}. Your local unsynced draft has not been deleted.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={primary} onClick={() => { setRestoreState("checking"); setRetryRestore(x => x + 1); }}>Retry connection</button>
        <button type="button" className={outline} onClick={() => { clearActiveExam(classroomId); setRestoreState("ready"); setRestoreError(""); }}>Back to exams</button>
      </div>
    </div>;
  }
  // Keep an active student exam as a focused view; never render the exam list underneath.
  if (entryExam && !canManage) {
    return <div className="en-exam-view text-[#171B18]"><ExamEntryGate classroomId={classroomId} examId={entryExam} onEnter={()=>{const id=entryExam;rememberActiveExam(classroomId,id,"active");setEntryExam(null);setTaking(id);}} onExit={()=>{clearActiveExam(classroomId,entryExam);setEntryExam(null);}}/></div>;
  }
  if (taking && !canManage) {
    return <div className="en-exam-view text-[#171b18]">
      <ExamTake classroomId={classroomId} examId={taking} onClose={() => {
        clearActiveExam(classroomId, taking);
        setTaking(null);
        void client.invalidateQueries({ queryKey: ["classrooms", classroomId, "exams"] });
      }} />
    </div>;
  }
  return <div className="space-y-5 text-[#171b18]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Exams</h2><p className="mt-1 text-sm text-[#536058]">MCQ, written and coding exams.</p></div>
      {canManage && <button type="button" className={primary} onClick={() => { setCreating(v=>!v); setNotice(""); }}><Plus size={17} /> {creating ? "Close editor" : "Create exam"}</button>}
    </div>
    {!canManage && activeAttempts.data?.map(attempt=><div key={attempt.exam_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><p className="font-semibold">{attempt.title}</p><p className="text-xs text-muted-foreground">In progress · {attempt.last_saved_at?`Saved ${dateLabel(attempt.last_saved_at)}`:"No server save yet"}</p></div><button className={primary} onClick={()=>{rememberActiveExam(classroomId,attempt.exam_id,"active");setTaking(attempt.exam_id);}}>Resume exam</button></div>)}
    {notice && <div role="status" className="rounded-xl bg-[#e9ede5] px-4 py-3 text-sm text-[#5f7358]">{notice}</div>}
    {canManage && !creating && <QuestionBank classroomId={classroomId}/>}
    {creating && canManage && <ExamCreator classroomId={classroomId} onClose={() => {setCreating(false);void client.invalidateQueries({queryKey:["classrooms",classroomId,"exams"]});}} />}

    {reviewing && canManage && <TeacherReview classroomId={classroomId} examId={reviewing} onClose={()=>setReviewing(null)}/>}
    {list.isPending && <ExamListSkeleton />}
    {list.isError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{examError(list.error)} <button className="underline" onClick={()=>void list.refetch()}>Retry</button></div>}
    {list.data && list.data.length===0 && <div className={panel}><ClipboardList className="mb-3 text-[#6f756f]"/><h3 className="font-bold">No exams yet</h3><p className="mt-1 text-sm text-[#536058]">{canManage ? "Create your first exam; it starts as a private draft." : "Your teacher has not published any exams yet."}</p></div>}
    <div className="grid gap-4 lg:grid-cols-2">{list.data?.map(exam=><ExamCard key={exam.id} exam={exam} canManage={canManage} onPublish={()=>{if(window.confirm("Publish this exam for enrolled students? Questions can no longer be edited."))publish.mutate(exam.id);}} onTake={()=>{rememberActiveExam(classroomId,exam.id,"entry");setEntryExam(exam.id);setReviewing(null);}} onReview={()=>{setReviewing(reviewing===exam.id?null:exam.id);setTaking(null);}} busy={publish.isPending && publish.variables === exam.id} now={now}/>)}</div>
    {publish.isError && <p role="alert" className="text-sm text-red-700">{examError(publish.error)}</p>}
    <p className="text-xs leading-5 text-[#6f756f]">Exam results appear after teacher review and publication.</p>
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
  const [allowPhone,setAllowPhone]=useState(false);
  const [uploads, setUploads] = useState(0);
  const [questions,setQuestions]=useState<ExamQuestion[]>([newQuestion()]);
  const mutation=useMutation({mutationFn:(payload:NewExam)=>examService.create(classroomId,payload),onSuccess:onClose});
  function updateQuestion(index:number,patch:Partial<ExamQuestion>) {setQuestions(current=>current.map((q,i)=>i===index?{...q,...patch}:q));}
  function create(){
    const payload:NewExam={allow_mobile_mcq:allowPhone&&questions.every(q=>q.kind==="mcq"),title:title.trim(),description:description.trim(),starts_at:new Date(starts).toISOString(),ends_at:new Date(ends).toISOString(),duration_minutes:duration,questions:questions.map(q=>q.kind==="mcq"?{...q,options:q.options?.map(o=>o.trim()),sample_answer:""}:{...q,options:[],correct_option:undefined})};
    mutation.mutate(payload);
  }
  return <section className={panel}><h3 className="mb-4 text-lg font-bold">Build an exam <span className="ml-2 text-sm font-normal text-[#6f756f]">Private draft</span></h3>
    <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Exam title<input className={field} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Midterm practical"/></label>
      <label className="space-y-2 text-sm font-semibold">Duration (minutes)<input className={field} type="number" min={1} max={240} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>
      <label className="space-y-2 text-sm font-semibold">Start (local time)<input className={field} type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></label>
      <label className="space-y-2 text-sm font-semibold">End (local time)<input className={field} type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></label>
    </div><label className="mt-4 block space-y-2 text-sm font-semibold">Instructions<textarea className={field} value={description} rows={2} maxLength={5000} onChange={e=>setDescription(e.target.value)} placeholder="Allowed tools, exam rules, grading…"/></label>
    <MobileExamOption enabled={allowPhone} onChange={setAllowPhone} mcqOnly={questions.every(q=>q.kind==="mcq")}/>
    <QuestionBank classroomId={classroomId} onAdd={items=>setQuestions(current=>{const existing=current.filter(q=>q.prompt.trim()||q.options?.some(o=>o.trim())||q.sample_answer?.trim()||q.tester);if(existing.length+items.length>40){window.alert("Maximum 40 questions per exam");return current;}return [...existing,...items]})}/>
    <div className="mt-6 flex items-center justify-between gap-2"><h4 className="font-bold">Questions ({questions.length}/40)</h4><button type="button" className={outline} disabled={questions.length>=40} onClick={()=>setQuestions(q=>[...q,newQuestion()])}><Plus size={16}/> Add question</button></div>
    <div className="mt-4 space-y-4">{questions.map((q,i)=><section key={q.id} className="rounded-[22px_10px_20px_12px] border border-[#d9ddd4] bg-[#f3f1ea] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong>Question {i+1}</strong><button type="button" className="text-xs font-semibold text-[#b34450]" disabled={questions.length===1} onClick={()=>setQuestions(current=>current.filter((_,n)=>i!==n))}><Trash2 size={15}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Type<select className={field} value={q.kind} onChange={e=>{const kind=e.target.value as QuestionKind;updateQuestion(i,{kind,tester:kind==="coding"?q.tester:undefined,options:kind==="mcq"?["",""]:[],correct_option:kind==="mcq"?0:undefined});}}><option value="mcq">MCQ</option><option value="theory">Theory</option><option value="coding">Coding</option></select></label>
        <label className="space-y-1 text-sm">Points<input className={field} type="number" min={1} max={100} value={q.points} onChange={e=>updateQuestion(i,{points:Number(e.target.value)})}/></label></div>
      <label className="mt-3 block space-y-1 text-sm">Question / problem statement<textarea className={field} rows={3} maxLength={10000} value={q.prompt} onChange={e=>updateQuestion(i,{prompt:e.target.value})}/></label>
      {q.kind==="mcq"?<div className="mt-3 space-y-2"><p className="text-xs text-[#536058]">Select the correct answer.</p>{q.options?.map((option,j)=><div key={j} className="flex items-center gap-2"><input aria-label={`Correct option ${j+1}`} type="radio" name={`correct-${q.id}`} checked={q.correct_option===j} onChange={()=>updateQuestion(i,{correct_option:j})}/><input aria-label={`Option ${j+1}`} className={field} value={option} onChange={e=>updateQuestion(i,{options:q.options?.map((o,k)=>k===j?e.target.value:o)})}/>{(q.options?.length??0)>2&&<button type="button" className="text-[#b34450]" onClick={()=>updateQuestion(i,{options:q.options?.filter((_,k)=>k!==j),correct_option:0})}><Trash2 size={16}/></button>}</div>)}<button type="button" className={outline} disabled={(q.options?.length??0)>=6} onClick={()=>updateQuestion(i,{options:[...(q.options??[]),""]})}>Add option</button></div>:
        <div className="mt-3 grid gap-3"><label className="space-y-1 text-sm">Reference solution / marking notes (teacher only)<textarea className={field} rows={3} value={q.sample_answer??""} maxLength={15000} onChange={e=>updateQuestion(i,{sample_answer:e.target.value})}/></label>{q.kind==="coding"&&<label className="space-y-1 text-sm">Expected language<select className={field} value={q.language||"python"} onChange={e=>updateQuestion(i,{language:e.target.value})}><option value="python">Python</option><option value="go">Go</option><option value="cpp">C++</option><option value="java">Java</option><option value="javascript">JavaScript</option><option value="c">C</option><option value="typescript">TypeScript</option><option value="rust">Rust</option><option value="ruby">Ruby</option><option value="php">PHP</option><option value="other">Other (no compiler)</option></select></label>}</div>}
      <SaveBankQuestion classroomId={classroomId} question={q}/>
      {q.kind === "coding" && <QuestionTesterUpload classroomId={classroomId} tester={q.tester} disabled={mutation.isPending || uploads > 0} onBusyChange={delta=>setUploads(n=>n+delta)} onChange={tester=>setQuestions(list=>list.map(item=>item.id===q.id && item.kind==="coding"?{...item,tester}:item))} />}
    </section>)}</div>
    {mutation.isError&&<p className="mt-4 text-sm text-[#b34450]" role="alert">{examError(mutation.error)}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className={primary} disabled={mutation.isPending || uploads > 0} onClick={()=>{if(!title.trim()||!starts||!ends){window.alert("Provide a title, start and end time.");return;}create();}}>{mutation.isPending ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {mutation.isPending?"Saving draft…":"Save private draft"}</button><button type="button" className={outline} disabled={mutation.isPending || uploads > 0} onClick={onClose}>Cancel</button></div>
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
  // Phase 15: durable draft during the browser tab session and versioned server saves.
  const serverRevision=useRef(0);
  const savePromiseRef=useRef<Promise<boolean>|null>(null);
  const submittingRef=useRef(false);
  const [online,setOnline]=useState(true);
  const [conflictDraft,setConflictDraft]=useState<Record<string,string>|null>(null);
  const userId=useAuthStore(state=>state.user?.id??"");
  const [clockOffset,setClockOffset]=useState(0);
  function storeDraft(next:Record<string,string>) {
    if(!live||submitted)return;
    if(!saveExamDraft(userId,live.attempt.id,{answers:next,serverRevision:serverRevision.current,at:Date.now(),expiresAt:live.attempt.expires_at}))setSaved("Browser storage unavailable — keep this page open until saved");
  }
  function removeDraft(){if(live)try{removeExamDraft(userId,live.attempt.id);}catch{}}

  const [loading,setLoading]=useState(true);
  useEffect(()=>{let mounted=true;examService.attempt(classroomId,examId).catch(err=>{if(err?.response?.status===404)return examService.start(classroomId,examId);throw err;}).then(data=>{
    if(!mounted)return;
    serverRevision.current=data.attempt.revision??0;
    setClockOffset(Date.parse(data.server_time)-Date.now());
    let recovered=data.attempt.answers;
    if(data.attempt.status==="in_progress"){
      try{
        const local=readExamDraft(userId,data.attempt.id);
        if(local){
          if(local.answers && typeof local.answers==="object" && !sameAnswers(local.answers,recovered)){
            if(local.serverRevision===serverRevision.current){recovered=local.answers;dirty.current=true;revision.current++;setSaved("Unsynced draft restored. Saving when online.");}
            else{setConflictDraft(local.answers);setError("A newer answer version exists on the server. Review your local draft before restoring.");}
          }
        }
      }catch{}
    }
    if (data.attempt.status !== "in_progress" || Date.parse(data.attempt.expires_at) <= Date.now()) {
      clearActiveExam(classroomId,examId);
    }
    setLive(data);setAnswers(recovered);answersRef.current=recovered;setSubmitted(data.attempt.status==="submitted");
  }).catch(e=>{if(mounted)setError(examError(e));}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false};},[classroomId,examId,userId]);
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
  // Local draft is written immediately on change. Server saves serialize and use CAS.
  useEffect(()=>{setOnline(navigator.onLine);const on=()=>setOnline(navigator.onLine);window.addEventListener("online",on);window.addEventListener("offline",on);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",on)};},[]);
  useEffect(()=>{if(!live||submitted)return;const timer=window.setInterval(()=>{if(dirty.current&&!submittingRef.current&&Date.now()+clockOffset<Date.parse(live.attempt.expires_at))void syncAnswers();},5000);return()=>window.clearInterval(timer);},[classroomId,examId,live,submitted]);
  useEffect(()=>{if(online&&dirty.current&&live&&!submitted)void syncAnswers();},[online,live,submitted]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty.current&&!submitted){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[submitted]);
  async function syncAnswers():Promise<boolean>{
    if(!live||submitted)return false;
    if(savePromiseRef.current)return savePromiseRef.current;
    if(conflictDraft)return false;
    if(!dirty.current)return true;
    if(!navigator.onLine){setSaved("Offline — draft kept in this browser");return false;}
    const snapshot={...answersRef.current};const localRevision=revision.current;const expected=serverRevision.current;
    const running=(async()=>{
      savingRef.current=true;setSaving(true);
      try{
        const persisted=await examService.save(classroomId,examId,snapshot,expected);
        serverRevision.current=persisted.revision;
        if(localRevision===revision.current){dirty.current=false;removeDraft();setSaved("Saved at "+new Date().toLocaleTimeString());}
        else{storeDraft(answersRef.current);setSaved("New edits waiting to save");}
        setError("");return true;
       }catch(e){
        const status=(e as {response?:{status?:number}})?.response?.status;
        if(status===409){
          try{const latest=await examService.attempt(classroomId,examId);serverRevision.current=latest.attempt.revision;
            if(sameAnswers(snapshot,latest.attempt.answers)){
              if(localRevision===revision.current){dirty.current=false;removeDraft();}else{storeDraft(answersRef.current);}
              setError("");setSaved("Save confirmed by server");return true;
            }
            setConflictDraft({...answersRef.current});answersRef.current=latest.attempt.answers;setAnswers(latest.attempt.answers);
          }catch{}
        }
        setError(examError(e));setSaved("Not synced — local draft retained");return false;
      }
      finally{savingRef.current=false;setSaving(false);}
    })();
    savePromiseRef.current=running;
    try{return await running;}finally{if(savePromiseRef.current===running)savePromiseRef.current=null;}
  }

  function change(id:string,value:string){if(submittingRef.current||submitted)return;const next={...answersRef.current,[id]:value};answersRef.current=next;setAnswers(next);dirty.current=true;revision.current+=1;storeDraft(next);setSaved("Unsaved changes");}
  async function save(){if(!live)return;await syncAnswers();}
  async function submit(){
    if(!live||submittingRef.current||!window.confirm("Submit your final answers? You cannot change them afterward."))return;
    submittingRef.current=true;setSaving(true);setError("");
    try{
      if(savePromiseRef.current)await savePromiseRef.current;
      for(let i=0;i<3&&dirty.current;i++){if(!await syncAnswers())break;}
      if(dirty.current){setError("Your latest answers are not yet saved. Reconnect or resolve the save conflict before submitting.");return;}
      const final=await examService.submit(classroomId,examId,answersRef.current,serverRevision.current);
      serverRevision.current=final.revision;
      setLive(current=>current?{...current,attempt:final}:current);setSubmitted(true);dirty.current=false;removeDraft();clearActiveExam(classroomId,examId);setSaved("Submitted successfully");
    }catch(e){
      // A response may be lost after the server successfully committed submission.
      try{
        const check=await examService.attempt(classroomId,examId);
        if(check.attempt.status==="submitted"){
          setLive(check);setSubmitted(true);dirty.current=false;removeDraft();clearActiveExam(classroomId,examId);setSaved("Submission confirmed by server");return;
        }
      }catch{}
      setError(examError(e)+" — submission not confirmed; try again after checking your connection.");
    }finally{submittingRef.current=false;setSaving(false);}
  }
  const until=live?Math.min(Date.parse(live.attempt.expires_at),Date.parse(live.exam.ends_at)):0;
  const left=Math.max(0,Math.floor((until-(now+clockOffset))/1000));const timedOut=Boolean(live)&&left<=0;
  return <section className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{live?.exam.title??"Exam session"}</h3><button className={outline} onClick={onClose}><ArrowLeft size={16}/> Back to exams</button></div>
    {(loading||Boolean(live&&!now))&&<ExamSessionSkeleton />}
    {!online&&<p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Offline: your draft is stored in this browser. Reconnect before the deadline to submit.</p>}
    {conflictDraft&&<div role="alert" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">Another tab/device saved a newer answer version. Your local draft is retained. <button type="button" className="ml-2 font-semibold underline" onClick={()=>{if(!window.confirm("Replace the newer server answers with your older local draft? This will overwrite other changes."))return;answersRef.current=conflictDraft;setAnswers(conflictDraft);revision.current++;dirty.current=true;setConflictDraft(null);setError("");storeDraft(conflictDraft);}}>Replace server answers with my local draft</button> <button type="button" className="ml-2 underline" onClick={()=>{removeDraft();dirty.current=false;setConflictDraft(null);setError("");}}>Keep newer server answers</button></div>}
    {error&&<p className="mb-4 rounded-xl bg-[#fff0ef] p-3 text-sm text-[#b34450]" role="alert">{error}</p>}
    {live&&now>0&&<>{live.attempt.entry_mode!=="mobile"&&<StudentDesktopPair classroomId={classroomId} examId={examId}/>}{live.attempt.entry_mode!=="mobile"&&<StudentExamMonitor classroomId={classroomId} examId={examId} attemptId={live.attempt.id} expiresAt={live.attempt.expires_at} active={!submitted&&!timedOut}/>}<div className="mb-5 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-[#e9ede5] px-4 py-2 text-sm font-bold"><Clock3 size={16}/>{String(Math.floor(left/3600)).padStart(2,"0")}:{String(Math.floor(left/60)%60).padStart(2,"0")}:{String(left%60).padStart(2,"0")}</span><span className="text-xs text-[#6f756f]">Ends {dateLabel(live.attempt.expires_at)}</span></div>
      {submitted?<div className="rounded-xl bg-[#e9ede5] p-5"><CheckCircle2 className="mb-2 text-[#5f7358]"/><p className="font-semibold">Your exam has been submitted.</p><p className="mt-2 text-sm">Receipt: {live.attempt.id}</p><p className="text-sm">Submitted {live.attempt.submitted_at?dateLabel(live.attempt.submitted_at):"Confirmed"} · Revision {live.attempt.revision}</p></div>:timedOut?<div className="rounded-xl bg-[#e9ede5] p-5"><LockKeyhole className="mb-2"/><p className="font-semibold">Time has expired.</p><p className="mt-1 text-sm">You cannot change or submit new answers. Any answers saved before the deadline are retained for teacher review.</p></div>:<>
      <div className="space-y-4">{live.questions.map((q,i)=><div key={q.id} className="rounded-[22px_10px_18px_12px] border border-[#d9ddd4] bg-[#f3f1ea] p-4"><div className="mb-3 flex items-start justify-between gap-4"><p className="font-semibold">{i+1}. {q.prompt}</p><span className="shrink-0 rounded-lg bg-[#e9ede5] px-2 py-1 text-xs">{q.points} pts</span></div>
        {q.kind==="mcq"?<div className="space-y-2">{q.options?.map((o,j)=><label key={j} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#dfe4d9] px-3 py-2 text-sm"><input type="radio" name={q.id} checked={answers[q.id]===String(j)} onChange={()=>change(q.id,String(j))}/>{o}</label>)}</div>:<><p className="mb-2 text-xs font-medium text-[#536058]">{q.kind==="coding"?`Code answer (${q.language||"text"}). Code can be run in the isolated compiler when enabled.`:"Written response"}</p>{q.kind==="coding"?<CodingWorkbench classroomId={classroomId} examId={examId} questionId={q.id} tester={q.tester} language={q.language||"other"} code={answers[q.id]??""} onChange={(value)=>change(q.id,value)} />:<textarea value={answers[q.id]??""} onChange={e=>change(q.id,e.target.value)} maxLength={8000} spellCheck rows={6} className={field} placeholder="Type your answer..."/>}</>}
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
    <div className="flex items-center gap-3"><LoaderCircle size={18} className="animate-spin text-[#2b342c]"/><span className="text-sm text-[#79695d]">Loading exam…</span></div>
    <div className="en-skeleton h-10 w-36 rounded-xl"/>
    {Array.from({length:2},(_,i)=><div key={i} className="rounded-[24px] border border-[#dfe4d9] bg-[#f3f1ea] p-5">
      <div className="en-skeleton h-5 w-2/3 rounded-lg"/><div className="en-skeleton mt-5 h-12 w-full rounded-xl"/><div className="en-skeleton mt-3 h-12 w-full rounded-xl"/>
    </div>)}
    <span className="sr-only">Exam details are loading…</span>
  </div>;
}
