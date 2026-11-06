"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { clientId } from "@/lib/client-id";
import { offlineKey, readOffline, saveAssignmentDraft, OfflineConflict, type DraftEntry } from "@/lib/offline-store";
import type { Assignment } from "@/services/assignments";
import { examError } from "@/services/exams";
export function useAssignmentDraft(classId: string, assignment: Pick<Assignment, "id" | "title">, baseVersion: number | undefined, enabled: boolean) {
    const owner = useAuthStore(s => s.user?.id);
    const [answer, setAnswer] = useState(""), [file, setFile] = useState<File | null>(null), [record, setRecord] = useState<DraftEntry | null>(null), [loading, setLoading] = useState(true), [dirty, setDirty] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [conflicted, setConflicted] = useState(false), [progress, setProgress] = useState(0), [now, setNow] = useState(Date.now);
    const current = useRef<DraftEntry | null>(null), revision = useRef(0), request = useRef(clientId()), chain = useRef<Promise<unknown>>(Promise.resolve());
    const id = owner ? offlineKey(owner, classId, assignment.id, "draft") : "";
    useEffect(() => {
        if (!enabled || !owner)
            return;
        let stopped = false;
        const load = async () => { try {
            const saved = await readOffline<DraftEntry["value"]>(owner, id);
            if (stopped)
                return;
            current.current = saved;
            setRecord(saved);
            if (saved) {
                setAnswer(saved.value.answer);
                setFile(saved.value.file ? new File([saved.value.file], saved.value.fileName, { type: saved.value.file.type }) : null);
                request.current = saved.value.requestId;
            }
            setLoading(false);
        }
        catch (err) {
            if (!stopped) {
                setLoading(false);
                setError(examError(err));
            }
        } };
        void load();
        const changes = async () => { try {
            const saved = await readOffline<DraftEntry["value"]>(owner, id);
            if (stopped)
                return;
            const before = current.current;
            if (saved?.value.revision === before?.value.revision) {
                current.current = saved;
                setRecord(saved);
            }
            else if (!saved && before?.value.queued) {
                current.current = null;
                setRecord(null);
                setAnswer("");
                setFile(null);
                request.current = clientId();
                setDirty(false);
                setNotice("Submission confirmed");
            }
            else if (saved || before) {
                setConflicted(true);
                setError("This draft changed in another tab. Reload the saved draft before continuing.");
            }
        }
        catch { /* Account changes are handled by provider cleanup. */ } };
        const changed = () => void changes();
        const upload = (event: Event) => { const detail = (event as CustomEvent<{
            id: string;
            progress: number;
        }>).detail; if (detail?.id === id)
            setProgress(detail.progress); };
        window.addEventListener("edunexus:offline-data", changed);
        window.addEventListener("edunexus:offline-upload", upload);
        const clock = setInterval(() => setNow(Date.now()), 5000);
        return () => { stopped = true; clearInterval(clock); window.removeEventListener("edunexus:offline-data", changed); window.removeEventListener("edunexus:offline-upload", upload); };
    }, [owner, id, enabled]);
    const expectedVersion = record && record.value.expectedVersion >= 0 ? record.value.expectedVersion : baseVersion ?? -1;
    const locked = record?.value.state === "queued" || (record?.value.state === "syncing" && record.value.leaseUntil > now);
    const persist = useCallback(async (queued: boolean, adoptVersion?: number) => {
        if (!owner)
            throw new Error("Sign in to save a draft.");
        const edit = revision.current;
        const payload = { answer, file, fileName: file?.name ?? "", expectedVersion: adoptVersion ?? (current.current && current.current.value.expectedVersion >= 0 ? current.current.value.expectedVersion : baseVersion ?? -1), requestId: request.current, queued };
        const save = () => saveAssignmentDraft(owner, classId, assignment.id, assignment.title, payload, current.current?.value.revision ?? null);
        const saved = await (chain.current = chain.current.catch(() => { }).then(save)) as DraftEntry;
        current.current = saved;
        setRecord(saved);
        if (revision.current === edit)
            setDirty(false);
        setError("");
        setNotice(queued ? "Queued. Submission will be confirmed when online." : "Draft saved on this device.");
        return saved;
    }, [answer, file, owner, classId, assignment.id, assignment.title, baseVersion]);
    useEffect(() => { if (!enabled || loading || !dirty || locked || conflicted)
        return; const timer = setTimeout(() => void persist(false).catch(err => { setError(examError(err)); setConflicted(err instanceof OfflineConflict); }), 350); return () => clearTimeout(timer); }, [enabled, loading, dirty, locked, conflicted, persist]);
    function editAnswer(value: string) { revision.current++; request.current = clientId(); setAnswer(value); setDirty(true); setNotice(""); }
    function editFile(value: File | null) { revision.current++; request.current = clientId(); setFile(value); setDirty(true); setNotice(""); }
    async function reload() { if (!owner)
        return; const saved = await readOffline<DraftEntry["value"]>(owner, id); current.current = saved; setRecord(saved); setAnswer(saved?.value.answer ?? ""); setFile(saved?.value.file ? new File([saved.value.file], saved.value.fileName, { type: saved.value.file.type }) : null); request.current = saved?.value.requestId ?? clientId(); setDirty(false); setConflicted(false); setError(""); }
    return { answer, file, record, loading, error, notice, locked, conflicted, progress, expectedVersion, editAnswer, editFile, persist, reload, setError, setNotice };
}
