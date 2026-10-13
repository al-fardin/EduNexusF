"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Code2, FileCode2, FilePlus2, Folder, FolderOpen,
  FolderPlus, Maximize2, Minimize2, Play, RefreshCw,
  TerminalSquare, Trash2, X, Pencil, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { codingService, type ActivityEvent } from "@/services/coding";
import { examError } from "@/services/exams";
import { workspaceMayReadStdin } from "@/services/stdin-detector";
import {
  WORKSPACE_PREFIX, detectFileLanguage, parseWorkspace,
  runWorkspace, type RunOutput, type Workspace,
} from "@/services/workspace-phase6";
import { loader, type OnMount } from "@monaco-editor/react";

// Load Monaco assets from EduNexus itself; no third-party CDN during an exam.
loader.config({ paths: { vs: "/monaco/vs" } });

// The same Monaco editor engine used in VS Code, with EduNexus-specific colors.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center animate-pulse text-sm text-[#637466]">Loading editor…</div> });

type Props = { classroomId: string; examId: string; questionId: string; language: string; code: string; onChange: (next: string) => void };
const maxWorkspaceBytes = 19500; // Existing exam answers cap each coding response at 20,000 bytes.
const filePathPattern = /^[A-Za-z0-9_./-]+$/;
const light = "#FBFAF6";
const ink = "#202C24";
const buttonClass = "inline-flex items-center gap-2 rounded-[12px_7px_11px_8px] border border-[#CBD4C9] px-3 py-2 text-xs font-semibold transition hover:bg-[#E2E9DD] disabled:opacity-40";
const iconButton = "rounded-md p-1.5 text-[#68786A] transition hover:bg-[#DDE7D9] hover:text-[#202C24]";
const monacoLanguage = (lang: string, filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ({ py:"python",js:"javascript",mjs:"javascript",ts:"typescript",tsx:"typescript",java:"java",cpp:"cpp",cc:"cpp",cxx:"cpp",c:"c",h:"c",hpp:"cpp",go:"go",rs:"rust",rb:"ruby",php:"php",json:"json",md:"markdown" } as Record<string,string>)[ext] || lang || "plaintext";
};

type TreeRow = { name: string; full: string; isFolder: boolean; depth: number };
function getRows(w: Workspace, closed: Set<string>): TreeRow[] {
  const folderNames = new Set(w.folders);
  for (const f of w.files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) folderNames.add(parts.slice(0,i).join("/"));
  }
  const children = (parent: string): TreeRow[] => {
    const all: TreeRow[] = [];
    for (const f of folderNames) if ((f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : "") === parent) all.push({name:f.split("/").at(-1)!, full:f,isFolder:true,depth:parent ? parent.split("/").length:0});
    for (const f of w.files) if ((f.path.includes("/") ? f.path.slice(0,f.path.lastIndexOf("/")) : "") === parent) all.push({name:f.path.split("/").at(-1)!,full:f.path,isFolder:false,depth:parent ? parent.split("/").length:0});
    all.sort((a,b) => Number(b.isFolder)-Number(a.isFolder) || a.name.localeCompare(b.name));
    return all.flatMap(row => row.isFolder && !closed.has(row.full) ? [row,...children(row.full)] : [row]);
  };
  return children("");
}
function validateName(name: string) {
  return name.length > 0 && name.length <= 120 && filePathPattern.test(name) && !name.split("/").some(x => x === "." || x === ".." || x.startsWith(".")) && !name.startsWith("/") && !name.endsWith("/") && !name.includes("//");
}

export function CodingWorkbench({ classroomId, examId, questionId, language, code, onChange }: Props) {
  const workspace = useMemo(() => parseWorkspace(code, language), [code, language]);
  const [current, setCurrent] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [sidebar, setSidebar] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [stdin, setStdin] = useState("");
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const edits = useRef(0);
  const recording = useRef(false);
  const effectivePath = current && workspace.files.some(f => f.path === current) ? current : workspace.entry;
  const activeFile = workspace.files.find(f => f.path === effectivePath) ?? workspace.files[0];
  const activePath = activeFile?.path ?? "";
  const entryLanguage = detectFileLanguage(workspace.entry);
  const activeLanguage = detectFileLanguage(activePath);
  const opened = [...new Set([...tabs.filter(t => workspace.files.some(f => f.path === t)), ...(activePath ? [activePath] : [])])];
  const rows = getRows(workspace, collapsed);

  const record = useCallback((ev: ActivityEvent) => {
    void codingService.activity(classroomId,examId,[ev]).catch(() => { recording.current = false; });
  },[classroomId,examId]);

  function persist(next: Workspace) {
    if (next.files.length > 24) { setError("Maximum 24 source files per coding question."); return false; }
    const serialized = WORKSPACE_PREFIX + JSON.stringify(next);
    if (new TextEncoder().encode(serialized).length > maxWorkspaceBytes) {setError("Workspace is full (19.5 KB). Shorten your code or remove files.");return false;}
    setError("");onChange(serialized);return true;
  }
  function editFile(value: string) {
    if (!activeFile) return;
    if (persist({...workspace, files:workspace.files.map(f => f.path===activePath ? {...f,content:value}:f)})) {
      edits.current += 1;
      if (edits.current >= 12 && !recording.current) {
        const count=edits.current;edits.current=0;recording.current=true;
        void codingService.activity(classroomId,examId,[{kind:"editor_edit",question_id:questionId,magnitude:count}])
          .catch(()=>undefined).finally(()=>{recording.current=false;});
      }
    }
  }
  function selectFile(p: string) {
    setCurrent(p);
    setTabs(prev=>prev.includes(p)?prev:[...prev,p]);
    // VS Code-like semantics: choosing a runnable file selects its compiler.
    if (detectFileLanguage(p) && workspace.entry !== p) persist({...workspace, entry:p});
  }
  function addFolder() {
    const v=window.prompt("New folder path (e.g. src/utils):", "src");
    if(v===null)return;
    const p=v.trim();
    if(!validateName(p)){setError("Invalid folder path; use letters, numbers, _, -, . and /.");return;}
    if(workspace.folders.includes(p)){setError("Folder already exists.");return;}
    const parts=p.split("/"); const folders=[...workspace.folders];
    for(let i=1;i<=parts.length;i++){const f=parts.slice(0,i).join("/");if(!folders.includes(f))folders.push(f);}
    persist({...workspace,folders});
  }
  function addFile() {
    const v=window.prompt("New filename with extension (e.g. main.cpp, Main.java, solution.py):", "");
    if(v===null)return;
    const p=v.trim();
    if(!validateName(p)){setError("Invalid filename; use only letters, numbers, _, -, . and /.");return;}
    if(workspace.files.some(f=>f.path===p)){setError("File already exists.");return;}
    const next={...workspace,files:[...workspace.files,{path:p,content:""}],entry:detectFileLanguage(p)?p:workspace.entry};
    if(persist(next)){setCurrent(p);setTabs(prev=>prev.includes(p)?prev:[...prev,p]);}
  }
  function renameRow(row: TreeRow) {
    const newPath=window.prompt(`Rename ${row.isFolder?"folder":"file"}:`,row.full);if(newPath===null||newPath===row.full)return;
    const p=newPath.trim();if(!validateName(p)){setError("Invalid path.");return;}
    if(row.isFolder){
      if(workspace.folders.includes(p)||workspace.files.some(f=>f.path===p)){setError("Path already exists.");return;}
      const adjust=(s:string)=>s===row.full?p:s.startsWith(row.full+"/")?p+s.slice(row.full.length):s;
      const files=workspace.files.map(f=>({...f,path:adjust(f.path)}));
      if(new Set(files.map(f=>f.path)).size!==files.length){setError("Target name conflicts with another file.");return;}
      if(persist({...workspace,files,folders:workspace.folders.map(adjust),entry:adjust(workspace.entry)})){
        setCurrent(current?adjust(current):null);setTabs(old=>old.map(adjust));
      }
    } else {
      if(workspace.files.some(f=>f.path===p)){setError("File already exists.");return;}
      if(persist({...workspace,files:workspace.files.map(f=>f.path===row.full?{...f,path:p}:f),entry:workspace.entry===row.full?p:workspace.entry})){
        setCurrent(c=>c===row.full?p:c);setTabs(old=>old.map(t=>t===row.full?p:t));
      }
    }
  }
  function removeRow(row: TreeRow) {
    const victims=workspace.files.filter(f=>f.path===row.full||(row.isFolder&&f.path.startsWith(row.full+"/")));
    if(!window.confirm(`Delete ${row.full}${row.isFolder ? ` and ${victims.length} contained file(s)` : ""}?`))return;
    const remaining=workspace.files.filter(f=>!victims.some(v=>v.path===f.path));
    const entry=remaining.some(f=>f.path===workspace.entry)?workspace.entry:(remaining.find(f=>detectFileLanguage(f.path))?.path ?? "");
    if(persist({...workspace,files:remaining,folders:workspace.folders.filter(f=>f!==row.full&&!f.startsWith(row.full+"/")),entry})){
      setTabs(old=>old.filter(t=>remaining.some(f=>f.path===t)));
      if(current&&!remaining.some(f=>f.path===current))setCurrent(entry);
    }
  }
  function requestRun(forceInput = false) {
    if(running) return;
    if(!entryLanguage){setError("Create and select a runnable source file first (.cpp, .py, .java, etc.).");return;}
    // Only ask for stdin when the source appears to read it. Normal programs
    // launch directly; a separate manual option handles dynamic input cases.
    if(forceInput || workspaceMayReadStdin(workspace)) {
      setShowInputDialog(true);
    } else {
      void execute("");
    }
  }
  async function execute(standardInput: string) {
    if(running)return;
    setShowInputDialog(false);
    setRunning(true);setShowTerminal(true);setError("");setOutput(null);setNotice("");
    try {setOutput(await runWorkspace(classroomId,examId,questionId,workspace,standardInput));}
    catch(e){setError(examError(e));}
    finally{setRunning(false);}
  }
  const onMount:OnMount = (_editor, monaco) => {
    monaco.editor.defineTheme("edunexus-olive",{
      base:"vs",inherit:true,rules:[
        {token:"comment",foreground:"829080"},{token:"keyword",foreground:"405F45",fontStyle:"bold"},
        {token:"string",foreground:"A16E39"},{token:"number",foreground:"875B9A"},
        {token:"type",foreground:"486B7B"},
      ],colors:{"editor.background":light,"editor.foreground":ink,"editorLineNumber.foreground":"#9CA79D","editorLineNumber.activeForeground":"#526B55","editor.selectionBackground":"#D5E2CB","editor.lineHighlightBackground":"#F0F2EA","editorCursor.foreground":"#506E50","editorIndentGuide.background1":"#E3E8DD"},
    });
    monaco.editor.setTheme("edunexus-olive");
  };
  return <div className={`${expanded?"fixed inset-3 z-[80] shadow-2xl":"relative"} overflow-hidden rounded-[22px_12px_19px_13px] border border-[#CAD4C8] bg-[#FBFAF6] text-[#202C24]`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C8D3C4] bg-[#E9EEE5] px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold"><Code2 size={17} className="text-[#526E54]"/> EduNexus Code Studio <span className="rounded-md bg-[#DCE7D9] px-2 py-1 text-[10px] tracking-wide text-[#526A54]">{entryLanguage ? `${entryLanguage} · ${workspace.entry}` : "New workspace"}</span></div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={()=>setSidebar(v=>!v)} className={iconButton} title="Toggle file Explorer" aria-label="Toggle Explorer">{sidebar?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button>
        <button type="button" onClick={()=>setExpanded(v=>!v)} className={iconButton} title={expanded?"Exit focus mode":"Expand editor"} aria-label="Toggle editor fullscreen">{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
        <button type="button" onClick={()=>requestRun()} disabled={running || !entryLanguage} className="ml-2 inline-flex items-center gap-2 rounded-[12px_7px_11px_8px] bg-[#2B342C] px-4 py-2 text-xs font-bold text-[#FBFAF6] transition hover:bg-[#485E4E] disabled:opacity-50">
          {running?<RefreshCw size={15} className="animate-spin"/>:<Play size={15} fill="currentColor"/>}{running?"Running…":"Run"}
        </button>
      </div>
    </div>
    <div className={`flex ${expanded?"h-[calc(100vh-125px)]":"h-[465px]"} min-h-0`}>
      {sidebar&&<aside className="flex w-[215px] min-w-[150px] shrink-0 flex-col border-r border-[#D4DED1] bg-[#F0F2EB] text-xs">
        <div className="flex items-center justify-between border-b border-[#D4DED1] px-3 py-2 font-bold uppercase tracking-[0.1em] text-[#647466]"><span>Explorer</span><div className="flex gap-0.5"><button type="button" className={iconButton} onClick={addFile} title="New file" aria-label="New file"><FilePlus2 size={16}/></button><button type="button" className={iconButton} onClick={addFolder} title="New folder" aria-label="New folder"><FolderPlus size={16}/></button></div></div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#8B9A8D]">Exam workspace</div>
          {rows.map(row=><div key={row.full} className={`group flex items-center gap-1 py-1 pr-1 ${!row.isFolder&&row.full===activePath?"bg-[#DFE8DC] text-[#253F2C]":"hover:bg-[#E3EAE0]"}`} style={{paddingLeft:8+Math.min(row.depth,5)*12}}>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left" title={row.full} onClick={()=>row.isFolder?setCollapsed(prev=>{const next=new Set(prev);if(next.has(row.full))next.delete(row.full);else next.add(row.full);return next;}):selectFile(row.full)}>
              {row.isFolder?(collapsed.has(row.full)?<ChevronRight size={12}/>:<ChevronDown size={12}/>):<span className="w-3"/>}
              {row.isFolder?(collapsed.has(row.full)?<Folder size={15} className="shrink-0 text-[#A48243]"/>:<FolderOpen size={15} className="shrink-0 text-[#A48243]"/>):<FileCode2 size={14} className="shrink-0 text-[#607961]"/>}
              <span className="truncate">{row.name}</span>
            </button>
            <button type="button" className="hidden rounded p-0.5 hover:bg-[#C9D9C8] group-hover:block" title={`Rename ${row.full}`} onClick={()=>renameRow(row)} aria-label={`Rename ${row.full}`}><Pencil size={12}/></button>
            <button type="button" className="hidden rounded p-0.5 text-[#9A534B] hover:bg-[#F7E7E3] group-hover:block" title={`Delete ${row.full}`} onClick={()=>removeRow(row)} aria-label={`Delete ${row.full}`}><Trash2 size={12}/></button>
          </div>)}
        </div>
        <div className="border-t border-[#D4DED1] px-3 py-2 text-[10px] text-[#7B887C]">{workspace.files.length}/24 files · Private exam workspace</div>
      </aside>}
      <div className="flex min-w-0 flex-1 flex-col bg-[#FBFAF6]">
        <div className="flex min-h-[38px] items-center gap-0 overflow-x-auto border-b border-[#D4DED1] bg-[#EFF1EA]">
          {opened.map(t=><div key={t} className={`inline-flex shrink-0 items-center gap-1 border-r border-[#D4DED1] px-2.5 py-2 text-xs ${t===activePath?"border-t-2 border-t-[#6A8A65] bg-[#FBFAF6] font-semibold":"text-[#778579]"}`}><button type="button" className="flex items-center gap-1.5" onClick={()=>selectFile(t)}><FileCode2 size={13}/>{t.split("/").at(-1)}</button><button type="button" title="Close tab" aria-label={`Close ${t} tab`} onClick={()=>{setTabs(old=>old.filter(x=>x!==t));if(t===activePath)setCurrent(workspace.entry)}} className="ml-1 hover:text-[#9A534B]"><X size={12}/></button></div>)}
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-[#E2E8DF] px-3 py-1 text-[10px] text-[#7B887C]"><span className="truncate">{activePath ? `workspace / ${activePath}` : "Empty workspace"}</span><span className="shrink-0">{activeFile ? `${activeFile.content.split("\n").length} lines` : "Create a file to begin"}</span></div>
        <div className="min-h-0 flex-1" onPasteCapture={e=>{const n=e.clipboardData?.getData("text")?.length??0;if(n)record({kind:"paste",question_id:questionId,magnitude:Math.min(n,20000)});}}>
          {activeFile ? <MonacoEditor key={activePath} path={activePath} height="100%" value={activeFile.content} language={monacoLanguage(activeLanguage || language,activePath)} theme="edunexus-olive" onMount={onMount} onChange={(value: string | undefined)=>editFile(value??"")} options={{fontSize,fontFamily:"Consolas, 'Cascadia Code', 'Fira Code', monospace",fontLigatures:true,minimap:{enabled:true},automaticLayout:true,scrollBeyondLastLine:false,tabSize:4,insertSpaces:true,wordWrap:wordWrap?"on":"off",lineNumbers:"on",renderWhitespace:"selection",bracketPairColorization:{enabled:true},suggestOnTriggerCharacters:true,quickSuggestions:true,padding:{top:14,bottom:14}}}/> :
          <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center text-[#68786A]"><FilePlus2 size={36} strokeWidth={1.5}/><div><div className="font-semibold text-[#27372C]">Create your first source file</div><p className="mt-1 text-xs">Choose any supported extension. The compiler follows your filename.</p></div><button type="button" className={buttonClass} onClick={addFile}>+ New file</button></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between border-t border-[#CBD8C9] bg-[#E8EEE5] px-2.5 py-1.5 text-[10px] text-[#586D5D]"><div className="flex items-center gap-3"><span>{activePath}</span><span>UTF-8</span><span>{activeLanguage || "plain text"}</span></div><div className="flex items-center gap-2"><button type="button" className="hover:underline" onClick={()=>setWordWrap(v=>!v)}>Wrap: {wordWrap?"on":"off"}</button><button type="button" className="hover:underline" onClick={()=>setFontSize(v=>Math.max(11,v-1))}>A−</button><span>{fontSize}px</span><button type="button" className="hover:underline" onClick={()=>setFontSize(v=>Math.min(19,v+1))}>A+</button></div></div>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-[#CBD8C9] bg-[#F0F2EB] px-3 py-2 text-xs">
      <span className="font-semibold">Run entry</span>
      <select aria-label="Select main entry file" className="max-w-[220px] rounded-md border border-[#CAD5C8] bg-[#FBFAF6] px-2 py-1.5 text-xs" value={workspace.entry} onChange={e=>selectFile(e.target.value)}>
        {!entryLanguage && <option value="">Choose a runnable file</option>}
        {workspace.files.filter(f=>detectFileLanguage(f.path)).map(f=><option key={f.path} value={f.path}>{f.path} · {detectFileLanguage(f.path)}</option>)}
      </select>
      <button type="button" className={`${buttonClass} ml-auto`} onClick={()=>requestRun(true)} disabled={running || !entryLanguage} title="Provide standard input manually for dynamic or conditional programs"><TerminalSquare size={14}/>Run with input…</button>
      <button type="button" className={buttonClass} onClick={()=>setShowTerminal(v=>!v)}><TerminalSquare size={14}/>{showTerminal?"Hide terminal":"Show terminal"}</button>
    </div>
    {showTerminal && <div className="border-t border-[#CBD8C9] bg-[#F7F8F4] px-3 pb-3 pt-2 text-xs">
      <div className="mt-2 flex items-center gap-2 font-semibold text-[#415D46]"><TerminalSquare size={14}/> OUTPUT / TERMINAL {output&&<span className="ml-auto text-[10px] font-normal">{output.status} · {output.duration_ms} ms</span>}</div>
      <pre role="status" className="mt-1 max-h-48 min-h-16 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[#DFE5DC] bg-[#FBFAF6] p-3 font-mono text-xs leading-5 text-[#273629]">{running?"Compiling and running in isolated Docker…":output?(output.stdout||"")+(output.stderr?"\n"+output.stderr:"") || "Process finished (no output).":"Terminal ready · Choose an entry file and press Run."}</pre>
      {output?.truncated&&<p className="mt-1 text-[#9B703C]">Output truncated at the server limit.</p>}
    </div>}
    {showInputDialog && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#101810]/55 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowInputDialog(false)}}>
      <div role="dialog" aria-modal="true" aria-label="Run program input" className="w-full max-w-xl rounded-[23px_13px_21px_16px] border border-[#BFCBB9] bg-[#FBFAF6] p-5 shadow-2xl">
        <div className="flex items-center gap-2 font-semibold text-[#2B342C]"><TerminalSquare size={18}/> Run {workspace.entry}</div>
        <p className="mt-2 text-xs text-[#68786A]">Compiler: {entryLanguage}. Input-reading code was detected. Enter standard input (optional if this path does not need it).</p>
        <textarea autoFocus rows={6} maxLength={4096} value={stdin} onChange={e=>setStdin(e.target.value)} placeholder="Program input, for example: 5" className="mt-3 w-full rounded-lg border border-[#C7D3C4] bg-white p-3 font-mono text-sm text-[#25382A] focus:outline-[#617B61]" onKeyDown={e=>{if(e.key==="Escape")setShowInputDialog(false); if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))void execute(stdin);}}/>
        <div className="mt-3 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={()=>setShowInputDialog(false)}>Cancel</button><button type="button" className={buttonClass} onClick={()=>void execute("")} title="Run with empty standard input (EOF)">Run without input</button><button type="button" className="rounded-lg bg-[#2B342C] px-5 py-2 text-sm font-semibold text-white" onClick={()=>void execute(stdin)}>OK · Run</button></div>
      </div>
    </div>}
    {error&&<div role="alert" className="mx-3 my-2 rounded-lg bg-[#F8E8E5] px-3 py-2 text-xs text-[#9B433F]">{error}</div>}
    {notice&&<p className="mx-3 my-2 text-xs text-[#526950]">{notice}</p>}
    <div className="border-t border-[#D7DED3] bg-[#F1F4EE] px-3 py-2 text-[11px] text-[#657667]">Folder files, code edits, paste sizes and run attempts remain tied to this exam. Click <strong>Save progress</strong> on the exam or wait for autosave. Running code does not submit answers.</div>
  </div>;
}
