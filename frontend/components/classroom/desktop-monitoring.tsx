"use client";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Laptop,Copy,ShieldCheck,AlertTriangle,RefreshCw} from "lucide-react";
import {desktopMonitor} from "@/services/desktop-monitor";
import {examError} from "@/services/exams";

export function StudentDesktopPair({classroomId,examId}:{classroomId:string;examId:string}){
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const status=useQuery({queryKey:["desktop-monitor-status",classroomId,examId],queryFn:()=>desktopMonitor.status(classroomId,examId),refetchInterval:8000,retry:1});
  async function pair(){
    setBusy(true);setError("");
    try {const r=await desktopMonitor.pair(classroomId,examId);setCode(r.pair_code);}catch(e){setError(examError(e));}
    finally{setBusy(false);}
  }
  return <section className="mt-3 rounded-2xl border border-[#CDD8C7] bg-[#FBFAF6] p-4 text-[#2B342C]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-bold"><Laptop size={17}/> Secure Exam Desktop Client</h4>
      <span className={`text-xs font-semibold ${status.data?.connected?"text-[#31704C]":"text-[#916543]"}`}>{status.data?.connected?`Connected · ${status.data.platform||"desktop"}`:"Not paired"}</span></div>
    <p className="mt-2 text-xs text-[#687466]">Additional app-switch evidence for Windows, macOS and Linux. The existing Chrome/Edge extension continues recording browser evidence separately. The Desktop Client is required to start the exam; reconnect here if the client disconnects.</p>
    <p className="mt-2 text-xs text-[#687466]">Run the downloaded Desktop Client, accept its exam-only monitoring notice, and paste a pairing code. No private chats, window titles or screenshots are collected by this release.</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={()=>void pair()} className="rounded-xl bg-[#2B342C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy?"Generating…":code?"Generate new code":"Generate pairing code"}</button>
      <button type="button" className="flex items-center gap-1 rounded-xl border border-[#CED9C9] px-3 py-2 text-xs font-semibold" onClick={()=>void status.refetch()}><RefreshCw size={13}/> Check connection</button>
    </div>
    {code&&<div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#EAF0E5] p-3"><code className="min-w-0 flex-1 break-all text-xs">{code}</code><button className="flex items-center gap-1 text-xs font-bold" type="button" onClick={()=>void navigator.clipboard.writeText(code).catch(()=>setError("Clipboard unavailable: select and copy the code."))}><Copy size={14}/> Copy</button><p className="w-full text-xs text-[#64745F]">One-time code · expires in 5 minutes · never share publicly. Generating a new code disconnects the old desktop session.</p></div>}
    {error&&<p role="alert" className="mt-2 text-xs text-[#A13D38]">{error}</p>}
  </section>;
}

export function TeacherDesktopEvidence({classroomId,examId,attemptId}:{classroomId:string;examId:string;attemptId:string}){
  const report=useQuery({queryKey:["desktop-monitor-evidence",classroomId,examId,attemptId],queryFn:()=>desktopMonitor.report(classroomId,examId,attemptId),refetchInterval:12000,retry:1});
  return <section className="mt-3 rounded-xl border border-[#D1D9CE] bg-[#FBFAF6] p-4 text-[#2B342C]">
    <h5 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16}/> Desktop activity evidence (teacher only)</h5>
    {report.isPending&&<p className="mt-2 text-xs">Loading desktop events…</p>}
    {report.isError&&<p className="mt-2 text-xs text-red-700">{examError(report.error)}</p>}
    {report.data&&<><p className="mt-2 text-xs text-[#637064]">{report.data.platform||"No desktop paired"} · {report.data.connected?"Client connected":"Not currently connected"} · {report.data.events.length} recent events</p>
      {report.data.platform==="windows"&&<p className="mt-2 text-xs text-[#61705D]">Clipboard metadata identifies the foreground app when clipboard changes; it does not read copied text or prove a specific source.</p>}
      {report.data.platform&&report.data.platform!=="windows"&&<p className="mt-2 text-xs text-[#926B36]">Clipboard-source tracking is not available on this OS in this preview. Foreground app changes are still shown.</p>}
      <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">Desktop app timeline</summary><div className="mt-2 max-h-80 space-y-2 overflow-auto">{report.data.events.map((e,i)=><div className="rounded-lg bg-[#F0F3EC] p-2" key={i}><span className="font-semibold">{e.kind==="clipboard_changed"?"Clipboard changed while app active":e.kind.replaceAll("_"," ")}</span>{e.app_name?` · ${e.app_name}`:""}<time className="ml-2 text-[#687466]">{new Date(e.recorded_at).toLocaleString()}</time></div>)}{report.data.events.length===0&&<p>No desktop events received.</p>}</div></details>
      <p className="mt-3 flex items-start gap-1 text-xs text-[#687466]"><AlertTriangle size={14} className="shrink-0"/>{report.data.notice}</p>
    </>}
  </section>;
}
