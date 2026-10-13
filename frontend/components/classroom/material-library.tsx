"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Download, FileUp, LoaderCircle, Paperclip, RefreshCw, Trash2 } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { getStreamErrorMessage } from "@/services/stream";
import { materialService, type ClassroomMaterial } from "@/services/materials";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

export function MaterialUploadForm({ classroomId, compact = false }: { classroomId: string; compact?: boolean }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: materialService.upload.bind(null, classroomId),
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setFile(null);
      setInputKey((n) => n + 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["classrooms", "stream", classroomId] }),
      ]);
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
        {(validationError || mutation.isError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{validationError || getStreamErrorMessage(mutation.error)}</p>}
        <button type="submit" disabled={!file || !title.trim() || !!validationError || mutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
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
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}

export function MaterialLibrary({ classroomId, canManage }: { classroomId: string; canManage: boolean }) {
  const materials = useQuery({ queryKey: ["materials", classroomId], queryFn: () => materialService.list(classroomId), enabled: Boolean(classroomId) });
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => materialService.remove(classroomId, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials", classroomId] }),
        queryClient.invalidateQueries({ queryKey: ["classrooms", "stream", classroomId] }),
      ]);
    },
  });
  return <div className="space-y-5">
    {canManage && <MaterialUploadForm classroomId={classroomId} />}
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen size={20} /> Class materials</h2><p className="mt-1 text-sm text-muted-foreground">Shared lecture notes, slides, readings and resources.</p></div>
        <button type="button" onClick={() => void materials.refetch()} disabled={materials.isFetching} className="rounded-xl border border-border p-3 disabled:opacity-60" aria-label="Refresh materials"><RefreshCw size={18} className={materials.isFetching ? "animate-spin" : ""} /></button>
      </div>
      {materials.isPending && <div className="space-y-3" role="status" aria-label="Loading materials">
        {[0,1,2].map(i=><div key={i} className="rounded-2xl border border-[#ded2c2] bg-[#f3f1ea] p-4"><div className="en-skeleton mb-3 h-5 w-2/5 rounded-lg"/><div className="en-skeleton mb-3 h-3 w-4/5 rounded-lg"/><div className="en-skeleton h-9 w-32 rounded-xl"/></div>)}
      </div>}
      {remove.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{getStreamErrorMessage(remove.error)}</p>}
      {materials.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{getStreamErrorMessage(materials.error)}</p>}
      {materials.isSuccess && materials.data.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No materials shared yet.</p>}
      {materials.isSuccess && <div className="space-y-3">{materials.data.map((item: ClassroomMaterial) => <article key={item.id} className="rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1"><h3 className="font-semibold text-foreground">{item.title}</h3>
            {item.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Paperclip size={13} /> {item.file_name} · {formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <MaterialDownloadButton classroomId={classroomId} materialId={item.id} filename={item.file_name} />
            {canManage && <button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete ${item.title}?`)) remove.mutate(item.id); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-red-200 px-3 text-sm text-red-700 disabled:opacity-50">{remove.isPending && remove.variables === item.id ? <LoaderCircle size={15} className="animate-spin"/> : <Trash2 size={15} />} {remove.isPending && remove.variables === item.id ? "Deleting…" : "Delete"}</button>}
          </div>
        </div>
      </article>)}</div>}
    </section>
  </div>;
}

function formatSize(bytes: number): string { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
