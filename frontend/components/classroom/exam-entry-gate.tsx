"use client";
import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ArrowLeft,CheckCircle2,ChevronRight,Download,ShieldCheck,ShieldX,RefreshCw,MonitorCheck,Laptop,Copy,LockKeyhole,Check} from "lucide-react";
import {examMonitor} from "@/services/exam-monitor";
import {desktopMonitor,type DesktopStatus} from "@/services/desktop-monitor";
import {desktopClientAvailable,sendDesktopPairRequest,desktopApiOrigin} from "@/lib/desktop-client-bridge";
import {examError,examService} from "@/services/exams";
import {monitorBridge,approvedExamKey} from "@/lib/exam-monitor-bridge";
import {detectExamBrowser,extensionAddress,type ExamBrowser,type SupportedExamBrowser} from "@/lib/exam-browser-support";

type Detection = "checking"|"missing"|"ready";
type DesktopOS = "windows"|"macos"|"linux"|"unsupported";
function identifyOS(): DesktopOS {
  const ua=navigator.userAgent.toLowerCase();
  if(ua.includes("windows"))return "windows";
  if(ua.includes("mac os")||ua.includes("macintosh"))return "macos";
  if(ua.includes("linux")&&!ua.includes("android"))return "linux";
  return "unsupported";
}
const operatingSystems:{id:DesktopOS;name:string;launch:string;requirements:string}[]=[
  {id:"windows",name:"Windows",launch:"Open EduNexus-Secure-Exam.exe",requirements:"64-bit Windows"},
  {id:"macos",name:"macOS",launch:"Open the installed application",requirements:"Intel or Apple Silicon Mac"},
  {id:"linux",name:"Linux",launch:"Open the installed application",requirements:"Linux x64; X11 for app detection"},
];
type GuideStep = {src:string;alt:string;heading:string;text:string};
const setupGuide = (browser:SupportedExamBrowser): GuideStep[] => {
  const edge=browser==="edge";
  return [
    {src:"/exam-monitor-guide/01-download.svg",alt:"Extract the EduNexus Exam Monitor ZIP",heading:"Download & extract",text:"Download the ZIP and choose Extract All. Keep the extracted folder."},
    {src:edge?"/exam-monitor-guide/edge-02-extensions.svg":"/exam-monitor-guide/02-extensions.svg",alt:`${edge?"Edge":"Chrome"} extensions page showing Developer mode`,heading:"Enable Developer mode",text:`Paste ${extensionAddress(browser)} in your address bar, then enable Developer mode.`},
    {src:edge?"/exam-monitor-guide/edge-03-load.svg":"/exam-monitor-guide/03-load.svg",alt:`${edge?"Edge":"Chrome"} Load unpacked extension button`,heading:"Load unpacked",text:"Choose Load unpacked and select the extracted EduNexus-Exam-Monitor folder (containing manifest.json)."},
    {src:edge?"/exam-monitor-guide/edge-04-verify.svg":"/exam-monitor-guide/04-verify.svg",alt:`${edge?"Edge":"Chrome"} extension enabled with site access for localhost`,heading:"Verify & return",text:"Enable EduNexus Exam Monitor; allow access to localhost:3000, then refresh the exam page and check connection."},
  ];
};

export function ExamEntryGate({classroomId,examId,onEnter,onExit}:{classroomId:string;examId:string;onEnter:()=>void;onExit:()=>void}){
  const policy=useQuery({queryKey:["monitor-policy",classroomId,examId],queryFn:()=>examMonitor.policy(classroomId,examId),retry:1});
  const exams=useQuery({queryKey:["classrooms",classroomId,"exams"],queryFn:()=>examService.list(classroomId),staleTime:30000});
  const [detected,setDetected]=useState<Detection>("checking");
  const [browser,setBrowser]=useState<ExamBrowser>("unsupported");
  const [guideBrowser,setGuideBrowser]=useState<SupportedExamBrowser>("chrome");
  const [copied,setCopied]=useState(false);
  const [checking,setChecking]=useState(false);
  const [joining,setJoining]=useState(false);
  const [error,setError]=useState("");
  const [details,setDetails]=useState(false);
  const [os,setOs]=useState<DesktopOS>("unsupported");
  const [desktopState,setDesktopState]=useState<DesktopStatus|null>(null);
  const [desktopBusy,setDesktopBusy]=useState(false);
  const [pairPending,setPairPending]=useState(false);
  const [desktopError,setDesktopError]=useState("");
  useEffect(()=>{setOs(identifyOS());},[]);
  useEffect(()=>{
    if(!policy.data?.enabled)return;
    let mounted=true;
    const poll=()=>desktopMonitor.preflightStatus(classroomId,examId).then(r=>{
      if(mounted)setDesktopState(r);
    }).catch(()=>{if(mounted)setDesktopState(null);});
    void poll();
    const timer=window.setInterval(()=>void poll(),5000);
    return()=>{mounted=false;window.clearInterval(timer);};
  },[classroomId,examId,policy.data?.enabled]);
  async function connectDesktopAutomatically(){
    if(desktopBusy || desktopState?.connected)return;
    setDesktopError("");setDesktopBusy(true);
    try {
      if(!(await desktopClientAvailable())) throw new Error("Open the updated EduNexus Secure Exam app on this computer, then try again.");
      const r=await desktopMonitor.preflightPair(classroomId,examId);
      // A one-time token still exists for secure backend identity binding,
      // but is transferred to the local app; students do not copy it.
      await sendDesktopPairRequest(r.pair_code,desktopApiOrigin());
      setPairPending(true);
    } catch(e){setDesktopError(examError(e));setPairPending(false);}
    finally{setDesktopBusy(false);}
  }
  async function recheckDesktop(){
    setDesktopError("");setDesktopBusy(true);
    try{setDesktopState(await desktopMonitor.preflightStatus(classroomId,examId));}
    catch(e){setDesktopError(examError(e));}
    finally{setDesktopBusy(false);}
  }
  useEffect(()=>{
    let mounted=true;
    const which=detectExamBrowser(window.navigator.userAgent);
    setBrowser(which);
    if(which!=="unsupported")setGuideBrowser(which);
    // Brave can masquerade as Chrome in its UA. Do not label it supported.
    const brave=window.navigator as Navigator & {brave?:{isBrave?:()=>Promise<boolean>}};
    void (async()=>{
      try{if(await brave.brave?.isBrave?.()){if(mounted){setBrowser("unsupported");setDetected("missing");}return;}}catch{}
      if(which==="unsupported"){if(mounted)setDetected("missing");return;}
      const r=await monitorBridge("STATUS");
      if(mounted)setDetected(r.ok?"ready":"missing");
    })();
    return()=>{mounted=false;};
  },[]);
  async function verify(){
    if(browser==="unsupported"){setError("Use desktop Google Chrome or Microsoft Edge to take this exam.");return;}
    setChecking(true);setError("");
    const result=await monitorBridge("STATUS");
    setDetected(result.ok?"ready":"missing");
    if(!result.ok)setError(result.error||"Extension unavailable. Reload it and allow site access for localhost:3000.");
    setChecking(false);
  }
  async function agreeAndEnter(){
    if(browser==="unsupported"||detected!=="ready"||!desktopState?.connected||joining||!policy.data?.enabled)return;
    setJoining(true);setError("");
    try {
      // Recheck on the actual click; consent is not accepted with a stale status.
      const check=await monitorBridge("STATUS");
      if(!check.ok){setDetected("missing");throw new Error("Extension disconnected. Recheck the connection.");}
      const desk=await desktopMonitor.preflightStatus(classroomId,examId);
      if(!desk.connected){setDesktopState(desk);throw new Error("Desktop Client disconnected. Reconnect and recheck before entering.");}
      const sessionKey=`exam-${examId}-${window.crypto.randomUUID()}`;
      const examEnd=exams.data?.find(exam=>exam.id===examId)?.ends_at;
      const endMs=examEnd?Date.parse(examEnd):NaN;
      if(!Number.isFinite(endMs)||endMs<=Date.now())throw new Error("Exam window closed or cannot be verified. Return to exams.");
      const expiresAt=Math.min(endMs,Date.now()+4*60*60*1000);
      const start=await monitorBridge("START",{sessionKey,expiresAt});
      if(!start.ok||!start.connected)throw new Error(start.error||"Cannot start browser monitoring");
      try{
        await examMonitor.admit(classroomId,examId,true);
        window.sessionStorage.setItem(approvedExamKey(classroomId,examId),sessionKey);
        onEnter();
      }catch(e){await monitorBridge("STOP");throw e;}
    }catch(e){setError(examError(e));setJoining(false);}
  }
  return <section className="mx-auto w-full max-w-5xl space-y-6 rounded-[28px] border border-[#D8DED3] bg-[#FBFAF6] p-5 text-[#171B18] shadow-[0_20px_70px_rgba(43,52,44,.08)] sm:p-8" aria-labelledby="monitor-gate-title">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E0E4DA] pb-5">
      <div className="flex items-start gap-3"><span className="rounded-2xl bg-[#E7ECE3] p-3 text-[#405D3E]"><ShieldCheck size={24}/></span><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#647760]">EduNexus · Secure exams</p><h2 id="monitor-gate-title" className="mt-1 text-2xl font-bold">Before you begin</h2><p className="mt-1 text-sm text-[#697367]">Set up browser and desktop monitoring before entering the exam.</p></div></div>
      <button type="button" onClick={onExit} disabled={joining} className="inline-flex items-center gap-2 rounded-xl border border-[#CDD4C9] px-4 py-2 text-sm font-medium hover:bg-[#EEF0EA]"><ArrowLeft size={16}/> Back to exams</button>
    </header>
    {policy.isPending&&<div role="status" className="animate-pulse rounded-xl bg-[#E8ECE4] p-5 text-sm">Checking exam requirements…</div>}
    {policy.isError&&<p role="alert" className="rounded-xl bg-[#F6EBE6] p-4 text-sm text-[#924A3D]">Cannot check exam monitoring settings: {examError(policy.error)}. Please retry.</p>}
    {policy.data&&!policy.data.enabled&&<div className="rounded-xl border border-[#E8CDBB] bg-[#FBF1E6] p-4 text-sm text-[#86533F]">This exam is not configured for required monitoring. Ask your teacher to enable it before joining.</div>}
    {policy.data?.enabled&&<>
      {browser==="unsupported"&&<div role="alert" className="rounded-2xl border border-[#DFC9B8] bg-[#FBF1E8] px-5 py-4 text-sm text-[#81503C]">
        <strong>Chrome or Microsoft Edge required.</strong> Open this exam in a desktop Chrome/Edge browser. Mobile, Firefox, Safari and untested Chromium variants are not supported.
      </div>}
      {detected==="missing"||detected==="checking"?<section className="space-y-5" aria-label="Extension setup">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE2D7] bg-[#F1F4ED] p-4">
          <div><h3 className="font-bold">One-time extension setup</h3><p className="mt-1 text-sm text-[#6A7769]">Works with desktop Google Chrome and Microsoft Edge.</p></div>
          <a href="/downloads/EduNexus-Exam-Monitor.zip" download className="inline-flex items-center gap-2 rounded-xl bg-[#2B342C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#415041]"><Download size={17}/> Download extension</a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2" aria-label="Setup guide browser">{(["chrome","edge"] as const).map(choice=><button key={choice} type="button" onClick={()=>{setGuideBrowser(choice);setCopied(false);}} aria-pressed={guideBrowser===choice} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${guideBrowser===choice?"border-[#2B342C] bg-[#2B342C] text-white":"border-[#CCD4C6] bg-white text-[#2B342C] hover:bg-[#EFF2EC]"}`}>{choice==="chrome"?"Google Chrome":"Microsoft Edge"}</button>)}</div><button type="button" onClick={()=>void navigator.clipboard.writeText(extensionAddress(guideBrowser)).then(()=>setCopied(true)).catch(()=>setError("Copy unavailable. Manually enter the address shown below."))} className="rounded-xl border border-[#BCC8B9] bg-white px-3 py-2 text-sm font-semibold">{copied?"Copied!":"Copy extensions address"}</button></div>
        <p className="rounded-xl bg-white px-4 py-3 font-mono text-sm font-semibold text-[#394A36]">{extensionAddress(guideBrowser)} <span className="ml-2 font-sans font-normal text-xs text-[#697365]">paste into the browser address bar</span></p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{setupGuide(guideBrowser).map((step,i)=><article key={step.src} className="overflow-hidden rounded-2xl border border-[#DDE3D8] bg-white">
          {/* SVG illustrations are labeled steps, not exact browser screenshots. */}
          <img src={step.src} alt={step.alt} className="aspect-[16/10] w-full border-b border-[#E6EAE3] object-cover" />
          <div className="p-4"><span className="text-xs font-bold uppercase tracking-wide text-[#587153]">Step {i+1}</span><h4 className="mt-1 font-semibold">{step.heading}</h4><p className="mt-1 text-xs leading-5 text-[#667364]">{step.text}</p></div>
        </article>)}</div>
        <p className="text-xs text-[#647060]">Chrome/Edge requires manual installation for an unpacked extension; a website cannot install it automatically. Use the same browser profile for the exam.</p>
        <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>void verify()} disabled={checking||detected==="checking"||browser==="unsupported"} className="inline-flex items-center gap-2 rounded-xl border border-[#B5C6B2] bg-white px-4 py-3 text-sm font-semibold hover:bg-[#F0F3ED] disabled:opacity-60"><RefreshCw size={16} className={checking?"animate-spin":""}/>{checking?"Checking…":"Check extension connection"}</button><span className="text-sm text-[#697365]">{detected==="checking"?"Checking browser…":browser==="unsupported"?"Unsupported browser":"Extension not detected yet"}</span></div>
      </section>:<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BFDBC3] bg-[#F0F5EE] px-5 py-4"><div className="flex items-center gap-3"><MonitorCheck className="text-[#3C7650]" size={24}/><div><p className="font-semibold">Extension ready</p><p className="text-xs text-[#5C6B5C]">You are ready to review exam monitoring consent.</p></div></div><button className="text-xs font-semibold underline" type="button" onClick={()=>void verify()}>Recheck</button></section>}
            <section className="space-y-5 rounded-2xl border border-[#D8E0D3] bg-white p-5" aria-label="Desktop monitor setup">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Laptop size={20} className="text-[#52694C]"/><h3 className="text-lg font-bold">Secure Exam Desktop Client</h3></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${desktopState?.connected?"bg-[#E5F1E6] text-[#2C6643]":"bg-[#F8EDE4] text-[#965039]"}`}>{desktopState?.connected?`Connected · ${desktopState.platform||"desktop"}`:"Connection required"}</span>
        </div>
        <p className="text-sm text-[#667365]">Install the desktop app once. Then connect with one click—no pairing code to copy or enter. Desktop activity starts only after the exam begins.</p>
        {!desktopState?.connected && <div className="space-y-3 rounded-2xl bg-[#F3F5F0] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">1. Download for your computer</p>
            {os==="windows" && <a href="https://github.com/al-fardin/EduNexusF/releases/download/v14.2.0/EduNexus-Secure-Exam.exe" className="rounded-xl bg-[#2B342C] px-4 py-2 text-sm font-semibold text-white"> <Download size={15} className="mr-2 inline"/>Windows .exe</a>}
            {os==="macos" && <div className="flex flex-wrap gap-2"><a href="https://github.com/al-fardin/EduNexusF/releases/download/v14.2.0/EduNexus-Secure-Exam-AppleSilicon.dmg" className="rounded-xl bg-[#2B342C] px-4 py-2 text-sm font-semibold text-white">Apple Silicon .dmg</a><a href="https://github.com/al-fardin/EduNexusF/releases/download/v14.2.0/EduNexus-Secure-Exam-Intel.dmg" className="rounded-xl border border-[#A8B9A0] px-4 py-2 text-sm font-semibold">Intel .dmg</a></div>}
            {os==="linux" && <a href="https://github.com/al-fardin/EduNexusF/releases/download/v14.2.0/EduNexus-Secure-Exam-Linux-x64.tar.gz" className="rounded-xl bg-[#2B342C] px-4 py-2 text-sm font-semibold text-white"><Download size={15} className="mr-2 inline"/>Linux x64</a>}
            {os==="unsupported" && <span className="text-sm text-[#99523B]">A supported desktop OS is required.</span>}
          </div>
          <p className="text-xs text-[#667365]">Open the downloaded application. On Linux, extract the archive before running the executable. macOS may require approval in Privacy & Security for this unsigned preview.</p>
          <div className="border-t border-[#DAE2D5] pt-3"><p className="mb-2 text-sm font-semibold">2. Connect Desktop Client</p>
            <button type="button" onClick={()=>void connectDesktopAutomatically()} disabled={desktopBusy||os==="unsupported"} className="rounded-xl bg-[#2B342C] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{desktopBusy?"Connecting…":"Connect Desktop Client"}</button>
            <button type="button" disabled={desktopBusy} onClick={()=>void recheckDesktop()} className="ml-2 rounded-xl border border-[#BCC8B9] px-4 py-3 text-sm font-semibold"><RefreshCw size={15} className="mr-1 inline"/>Recheck</button>
            {pairPending && !desktopState?.connected && <p role="status" className="mt-2 text-sm text-[#506B4A]">Connection request sent. In the desktop app, review the permission and click <strong>Approve & Connect</strong>. This page will verify automatically.</p>}
          </div>
        </div>}
        {desktopState?.connected && <p className="flex items-center gap-2 rounded-xl bg-[#EBF4E9] p-3 text-sm font-semibold text-[#356D48]"><Check size={16}/> Desktop Client verified. You can enter the exam after browser consent.</p>}
        {desktopError && <p role="alert" className="rounded-xl bg-[#FAEFEA] p-3 text-sm text-[#A44335]">{desktopError}</p>}
      </section>
<section className="space-y-4 rounded-2xl border border-[#D8E0D3] bg-white p-5">
        <h3 className="text-lg font-bold">Exam monitoring consent</h3>
        <p className="text-sm font-medium">During this exam, your teacher may review browser visits, searches, AI prompts, exam copy/paste active application names, and Windows clipboard-change metadata (not clipboard text). Do you agree?</p>
        <button type="button" onClick={()=>setDetails(x=>!x)} className="text-xs text-[#586E53] underline">{details?"Hide":"What is monitored?"}</button>
        {details&&<p className="rounded-xl bg-[#F3F5EF] p-3 text-xs leading-5 text-[#637062]">Only during your exam: active domains, search terms, newly submitted prompts on supported AI websites, selected text copied there, text pasted in your exam, tab changes and connection gaps. Past chats, unrelated page content, passwords and desktop-app messages are not collected. The desktop client records active app names; on Windows it also records which app was foreground when clipboard changed, without reading clipboard content. Other operating systems have limited clipboard-source support. Signals are evidence for review, not proof of cheating.</p>}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>void agreeAndEnter()} disabled={browser==="unsupported"||detected!=="ready"||!desktopState?.connected||os==="unsupported"||joining||!policy.data?.enabled||exams.isPending||exams.isError} className="inline-flex items-center gap-2 rounded-xl bg-[#2B342C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#455646] disabled:opacity-45"><CheckCircle2 size={18}/>{joining?"Entering…":"Agree & enter exam"}<ChevronRight size={16}/></button>
        <button type="button" onClick={()=>{window.sessionStorage.removeItem(approvedExamKey(classroomId,examId));onExit();}} disabled={joining} className="inline-flex items-center gap-2 rounded-xl border border-[#D9D5CD] px-5 py-3 text-sm font-semibold text-[#584B43] hover:bg-[#F7F1EE]"><ShieldX size={17}/> Decline & leave</button></div>
        <p className="text-xs text-[#728073]">Your exam timer starts only after you agree and enter.</p>
      </section>
    </>}
    {error&&<p role="alert" className="rounded-xl border border-[#E7C5B8] bg-[#FAEFEA] p-4 text-sm text-[#934A3C]">{error}</p>}
  </section>;
}
