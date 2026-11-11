"use client";
import {Localized} from "@/components/ui/localized";
import {SyncOverview} from "@/components/offline/sync-overview";
import { AssignmentDraftForm } from "@/components/classroom/assignment-draft-form";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, FileText } from "lucide-react";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import { authService } from "@/services/auth";
import { listOffline, purgeOffline, removeOffline, type DraftEntry } from "@/lib/offline-store";
import { materialService } from "@/services/materials";
import { ProtectedFilePreview } from "@/components/files/protected-preview";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ConfirmAction } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
const subscribeClient = () => () => { };
export default function OfflinePage() {
    const clientReady = useSyncExternalStore(subscribeClient, () => true, () => false), user = useAuthStore(s => s.user), client = useQueryClient();
    const [editing, setEditing] = useState<string | null>(null);
    const [error, setError] = useState(""), [clear, setClear] = useState(false), [busy, setBusy] = useState(false);
    const token = clientReady ? localStorage.getItem("access_token") : null;
    useEffect(() => { if (!token || user)
        return; let canceled = false; useAuthStore.getState().setAccessToken(token); authService.me().then(response => { if (!canceled && localStorage.getItem("access_token") === token)
        useAuthStore.getState().setUser(response.data as AuthUser); }).catch(() => { if (!canceled)
        setError("Connect to the internet to verify your account before opening saved work."); }); return () => { canceled = true; }; }, [token, user]);
    const listing = useQuery({ queryKey: ["offline-library", user?.id], queryFn: () => listOffline(user!.id), enabled: !!user, networkMode: "always" });
    useEffect(() => { const changed = () => void client.invalidateQueries({ queryKey: ["offline-library"] }); window.addEventListener("edunexus:offline-data", changed); return () => window.removeEventListener("edunexus:offline-data", changed); }, [client]);
    const materials = listing.data?.filter(r => r.kind === "material") ?? [], drafts = listing.data?.filter(r => r.kind === "draft") as DraftEntry[] | undefined;
    return <main className="en-saved-work-page mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"><header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/" className="text-xs text-muted-foreground"><Localized>Home</Localized></Link><h1 className="mt-2 text-2xl font-semibold"><Localized>Saved work</Localized></h1><p className="mt-1 text-sm text-muted-foreground">Materials and assignment drafts saved on this device.</p></div>{user && <Button variant="outline" onClick={() => setClear(true)}><Trash2 /><Localized>Clear saved data</Localized></Button>}</header>
 {!clientReady || token && !user && !error ? <ContentSkeleton rows={3}/> : !token ? <EmptyState title="Sign in while online" description="An existing verified session is required to open saved materials."/> : error && !user ? <ErrorState message={error}/> : null}
 {user && <><SyncOverview owner={user.id} records={listing.data??[]}/><section className="space-y-3"><h2 className="font-semibold"><Localized>Materials</Localized></h2>{listing.isPending ? <ContentSkeleton rows={2}/> : listing.isError ? <ErrorState message={examError(listing.error)} onRetry={() => void listing.refetch()}/> : !materials.length ? <EmptyState title="No saved materials" description="Files you open or download while online become available here."/> : <div className="grid gap-3 sm:grid-cols-2">{materials.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-border bg-card p-4"><h3 className="flex items-center gap-2 break-all text-sm font-semibold"><FileText size={17}/>{item.title}</h3><p className="text-xs text-muted-foreground">Saved {new Date(item.updatedAt).toLocaleString()} · {Math.max(1, Math.round(item.bytes / 1024))} KB</p><div className="flex flex-wrap gap-2"><ProtectedFilePreview path={`/classrooms/${item.classId}/materials/${item.target}/download`} filename={item.title}/><Button variant="outline" onClick={() => void materialService.download(item.classId, item.target, item.title).catch(e => setError(examError(e)))}><Download /><Localized>Download</Localized></Button><Button variant="ghost" aria-label={`Remove saved ${item.title}`} onClick={() => void removeOffline(user.id, item.id).catch(e => setError(examError(e)))}><Trash2 /></Button></div></article>)}</div>}</section>
 <section className="space-y-3"><h2 className="font-semibold">Assignment drafts</h2>{!drafts?.length ? <EmptyState title="No assignment drafts"/> : drafts.map(item => <article key={item.id} className="space-y-2 rounded-2xl border border-border bg-card p-4"><h3 className="font-medium">{item.title}</h3><p className="text-xs text-muted-foreground">{item.value.state === "syncing" ? "Confirming submission…" : item.value.state === "blocked" ? "Review needed" : item.value.queued ? "Queued for submission" : "Saved draft"}</p><p className="line-clamp-3 whitespace-pre-wrap text-sm">{item.value.answer}</p>{item.value.fileName && <p className="text-xs">Attachment: {item.value.fileName}</p>}{item.value.error && <p role="status" className="text-sm text-muted-foreground">{item.value.error}</p>}<div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => setEditing(editing === item.id ? null : item.id)}>{editing === item.id ? "Close draft" : "Edit saved draft"}</Button><a className="inline-block text-sm font-medium text-primary underline" href={`/student/classrooms/${item.classId}?tab=classwork&assignment=${item.target}`}>View assignment</a></div>{editing === item.id && <AssignmentDraftForm key={item.id} classroomId={item.classId} assignment={{ id: item.target, title: item.title }}/>}</article>)}</section></>}
 {error && user && <ErrorState message={error}/>}
 <ConfirmAction open={clear} onOpenChange={setClear} title="Clear saved work?" description="Saved materials, unsent drafts and queued submissions on this device will be removed." busy={busy} onConfirm={() => { if (!user)
        return; setBusy(true); void purgeOffline(user.id).then(() => setClear(false)).catch(e => setError(examError(e))).finally(() => setBusy(false)); }}/>
 </main>;
}
