"use client";

import {AccessibleMaterial} from "./accessible-material";
import {MaterialDeleteDialog} from "./material-usage";
import {EmptyState,ErrorState,UploadState} from "@/components/ui/app-feedback";
import {useTopics,matchesTopic,ResourceTopicPicker} from "./classwork-topics";
import {ProtectedFilePreview} from "@/components/files/protected-preview";
import { useClassroomComposer } from "@/lib/classroom-composer";
import { ArrowLeft, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Download, FileUp, LoaderCircle, Paperclip, RefreshCw, Trash2 } from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef,useState } from "react";
import { getStreamErrorMessage } from "@/services/stream";
import { materialService, type ClassroomMaterial } from "@/services/materials";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp3,.wav,.ogg,.mp4,.webm";

export function MaterialUploadForm({ classroomId, compact = false, onUploaded }: { classroomId: string; compact?: boolean; onUploaded?:()=>void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [progress,setProgress]=useState(0);const uploadAbort=useRef<AbortController|null>(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn:(data:{title:string;description:string;file:File})=>{uploadAbort.current=new AbortController();setProgress(0);return materialService.upload(classroomId,data,{signal:uploadAbort.current.signal,onUploadProgress:e=>setProgress(Math.min(100,Math.round(e.loaded/(e.total||data.file.size)*100)))})},
    onSettled:()=>{uploadAbort.current=null;void queryClient.invalidateQueries({queryKey:["materials",classroomId]});void queryClient.invalidateQueries({queryKey:["classrooms","stream",classroomId]})},
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setFile(null);
      setInputKey((n) => n + 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classroom-activity", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["materials", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["classrooms", "stream", classroomId] }),
      ]);
      onUploaded?.();
    },
  });

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setValidationError(selected && selected.size > MAX_FILE_BYTES ? "Max size: 15 MB." : "");
    setFile(selected);
    if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !title.trim() || mutation.isPending) return;
    if (file.size > MAX_FILE_BYTES) { setValidationError("Max size: 15 MB."); return; }
    setValidationError("");
    mutation.mutate({ title: title.trim(), description: description.trim(), file });
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-2xl bg-secondary p-3 text-primary"><FileUp size={21} /></span>
        <div><h2 className="font-bold text-foreground">Share learning material</h2>
          <p className="text-sm text-muted-foreground">Upload a file for the whole class. It will also appear on Stream.</p></div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className={compact ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
          <label className="block text-sm font-medium">Title
            <input className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" required maxLength={200} value={title} disabled={mutation.isPending} onChange={(e) => setTitle(e.target.value)} placeholder="Lecture 1 notes" />
          </label>
          <label className="block text-sm font-medium">File (max 15 MB)
            <input key={inputKey} type="file" required accept={ACCEPTED} disabled={mutation.isPending} onChange={chooseFile} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background p-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1" />
          </label>
        </div>
        <label className="block text-sm font-medium">Description (optional)
          <textarea rows={compact ? 2 : 3} maxLength={5000} value={description} disabled={mutation.isPending} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full resize-y rounded-xl border border-border bg-background p-3 outline-none focus:border-primary" placeholder="What should students read or prepare?" />
        </label>
        {(validationError || mutation.isError) && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{validationError || getStreamErrorMessage(mutation.error)}</p>}
        {mutation.isPending&&<UploadState progress={progress} onCancel={()=>uploadAbort.current?.abort()}/>}
        <button type="submit" disabled={!file || !title.trim() || !!validationError || mutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {mutation.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <FileUp size={17} />} {mutation.isPending ? "Uploading material…" : "Upload & publish to Stream"}
        </button>
      </form>
    </section>
  );
}

export function MaterialDownloadButton({ classroomId, materialId, filename, label = "Download material" }: { classroomId: string; materialId: string; filename: string; label?: string }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (working) return;
    setWorking(true);
    setError("");
    try { await materialService.download(classroomId, materialId, filename); }
    catch (cause) { setError(getStreamErrorMessage(cause)); }
    finally { setWorking(false); }
  }
  return <div>
    <button type="button" onClick={download} disabled={working} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:brightness-95 disabled:opacity-50">
      {working ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />} {label}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}

export function MaterialLibrary({ classroomId, canManage, topic="" }: { classroomId: string; canManage: boolean;topic?:string }) {
 const topicData=useTopics(classroomId);const [deleting,setDeleting]=useState<ClassroomMaterial|null>(null);
  const [composer,setComposer]=useClassroomComposer();
  const materials = useQuery({ networkMode:"always", queryKey: ["materials", classroomId], queryFn: () => materialService.list(classroomId), enabled: Boolean(classroomId) });
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (data: {id:string;reason:string}) => materialService.remove(classroomId, data.id,data.reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classroom-activity", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["materials", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["classrooms", "stream", classroomId] }),
      ]);
    },
  });
  if(canManage&&composer==="material")return <div className="en-composer-view"><button className="en-composer-back" onClick={()=>setComposer(null)}><ArrowLeft size={17}/>Back to classwork</button><MaterialUploadForm classroomId={classroomId} onUploaded={()=>setComposer(null)}/></div>;
  return <div className="space-y-5"><MaterialDeleteDialog classId={classroomId} material={deleting} close={()=>setDeleting(null)} confirm={async reason=>{if(deleting)await remove.mutateAsync({id:deleting.id,reason})}}/>
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen size={20} /> Class materials</h2><p className="mt-1 text-sm text-muted-foreground">Files shared with your class.</p></div>
        <div className="flex items-center gap-2">{canManage&&<button className="en-outline-button" onClick={()=>setComposer("material")}><Plus size={16}/>Add material</button>}<button type="button" onClick={() => void materials.refetch()} disabled={materials.isFetching} className="rounded-xl border border-border p-3 disabled:opacity-60" aria-label="Refresh materials"><RefreshCw size={18} className={materials.isFetching ? "animate-spin" : ""} /></button></div>
      </div>
      {materials.isPending && <div className="space-y-3" role="status" aria-label="Loading materials">
        {[0,1,2].map(i=><div key={i} className="rounded-2xl border border-border bg-background p-4"><div className="en-skeleton mb-3 h-5 w-2/5 rounded-lg"/><div className="en-skeleton mb-3 h-3 w-4/5 rounded-lg"/><div className="en-skeleton h-9 w-32 rounded-xl"/></div>)}
      </div>}
      {remove.isError && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{getStreamErrorMessage(remove.error)}</p>}
      {materials.isError && <ErrorState message={getStreamErrorMessage(materials.error)} onRetry={()=>void materials.refetch()}/>}
      {materials.isSuccess && materials.data.filter(item=>matchesTopic(topicData.data?.links,topic,"material",item.id)).length === 0 && <EmptyState title={topic?"No materials in this topic":"No materials shared yet"}/>}
      {materials.isSuccess && <div className="space-y-3">{materials.data.filter(item=>matchesTopic(topicData.data?.links,topic,"material",item.id)).map((item: ClassroomMaterial) => <article key={item.id} className="rounded-2xl border border-border bg-background p-4">{canManage&&<ResourceTopicPicker classId={classroomId} kind="material" id={item.id}/>}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1"><h3 className="font-semibold text-foreground">{item.title}</h3>
            {item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Paperclip size={13} /> {item.file_name} · {formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <ProtectedFilePreview path={`/classrooms/${classroomId}/materials/${item.id}/download`} filename={item.file_name} altText={item.image_alt}/><AccessibleMaterial classId={classroomId} id={item.id} filename={item.file_name} canManage={canManage}/><MaterialDownloadButton classroomId={classroomId} materialId={item.id} filename={item.file_name} />
            {canManage && <button type="button" disabled={remove.isPending} onClick={() => { setDeleting(item); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-destructive/30 px-3 text-sm text-destructive disabled:opacity-50">{remove.isPending && remove.variables?.id === item.id ? <LoaderCircle size={15} className="animate-spin"/> : <Trash2 size={15} />} {remove.isPending && remove.variables?.id === item.id ? "Deleting…" : "Delete"}</button>}
          </div>
        </div>
      </article>)}</div>}
    </section>
  </div>;
}

function formatSize(bytes: number): string { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
