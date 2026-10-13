"use client";
import { prettyWorkspaceAnswer } from "@/services/workspace-phase6";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, LoaderCircle } from "lucide-react";
import { examManagement } from "@/services/exam-management";
import { examError } from "@/services/exams";

export function ExamResults({ classroomId, canManage }: { classroomId: string; canManage: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState("");
  const listing = useQuery({ queryKey: ["published-results",classroomId], queryFn: () => examManagement.publicResults(classroomId), staleTime: 10000 });
  const own = useQuery({ queryKey: ["my-published-result",classroomId,expanded], queryFn: () => examManagement.myResult(classroomId,expanded!), enabled: !canManage && !!expanded });
  const exams = new Map<string,string>();
  for (const result of listing.data ?? []) exams.set(result.exam_id,result.exam_title);
  return <section className="space-y-5 text-foreground">
    <div><h2 className="text-2xl font-bold">Published examination results</h2><p className="mt-1 text-sm text-muted-foreground">Everyone in the class can see published total marks. Question feedback stays private to each student.</p></div>
    {listing.isPending && <div className="space-y-3" aria-label="Loading published results">{[1,2,3].map(i=><div className="h-20 animate-pulse rounded-2xl bg-secondary" key={i}/>)}</div>}
    {listing.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{examError(listing.error)}</p>}
    {listing.data?.length===0 && <div className="rounded-2xl border border-border bg-card p-6 text-sm">No results published yet. Exams ending does not automatically reveal unreviewed marks.</div>}
    {[...exams].map(([id,title]) => <article key={id} className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{title}</h3><button type="button" disabled={!!downloading} onClick={async()=>{setDownloading(id);try{await examManagement.downloadPDF(classroomId,id)}catch(e){alert(examError(e))}finally{setDownloading("")}}} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50">{downloading===id?<LoaderCircle className="animate-spin" size={16}/>:<Download size={16}/>} Public marksheet PDF</button></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2">Student ID / Roll</th><th className="py-2">Student name</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{listing.data?.filter(x=>x.exam_id===id).map(row=><tr key={row.attempt_id} className="border-b border-border/50"><td className="py-2 font-semibold">{row.student_roll || "Not set"}</td><td className="py-2">{row.student_name}</td><td className="py-2 text-right font-semibold">{row.total}/{row.max_points}</td></tr>)}</tbody></table></div>
      {!canManage && <button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold" onClick={()=>setExpanded(expanded===id?null:id)}><Eye size={16}/> {expanded===id?"Hide my details":"View my own detailed result"}</button>}
      {!canManage && expanded===id && <div className="rounded-xl bg-secondary p-4">{own.isPending?<div className="h-20 animate-pulse rounded-xl bg-card"/>:own.isError?<p role="status" className="text-sm">Your individual result is not published (or you did not participate).</p>:<><h4 className="font-semibold">My result: {own.data?.total}/{own.data?.maximum}</h4>{own.data?.questions.map((q,i)=><div key={q.question_id} className="mt-3 border-t border-border pt-3 text-sm"><div className="flex justify-between gap-3"><strong>Q{i+1}. {q.prompt}</strong><strong>{q.awarded}/{q.maximum}</strong></div><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">Your answer: {prettyWorkspaceAnswer(q.answer || "No response")}</p>{q.feedback && <p className="mt-1">Feedback: {q.feedback}</p>}</div>)}</>}</div>}
    </article>)}
  </section>;
}
