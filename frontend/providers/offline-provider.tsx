"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import { claimAssignmentDraft, finishAssignmentDraft, listOffline, purgeOffline, retainOfflineOwner, renewAssignmentLease, type DraftEntry } from "@/lib/offline-store";
import { uploadAssignmentDraft } from "@/lib/assignment-outbox";
import { clearOfflineSession } from "@/lib/offline-session";
export function OfflineProvider() {
    const owner = useAuthStore(s => s.user?.id), client = useQueryClient();
    useEffect(() => useAuthStore.subscribe((state, previous) => { if (previous.user?.id && previous.user.id !== state.user?.id) {
        void purgeOffline(previous.user.id).catch(() => { });
        clearOfflineSession(previous.user.id);
    } }), []);
    useEffect(() => {
        if (!owner)
            return;
        let stopped = false, busy = false;
        let controller: AbortController | null = null;
        void retainOfflineOwner(owner).catch(() => { });
        async function flush() {
            if (!owner || stopped || busy || !navigator.onLine)
                return;
            busy = true;
            try {
                const records = await listOffline(owner);
                if (!records.some(r => r.kind === "draft" && (r.value as DraftEntry["value"]).queued && (r.value as DraftEntry["value"]).state !== "blocked"))
                    return;
                // This request must reach the server: cached identity never authorizes writes.
                const verified = await api.get("/auth/me", { timeout: 10000 });
                if (verified.data.data.id !== owner || useAuthStore.getState().user?.id !== owner)
                    return;
                for (let count = 0; count < 20 && !stopped; count++) {
                    const token = useAuthStore.getState().accessToken ?? localStorage.getItem("access_token");
                    if (!token || useAuthStore.getState().user?.id !== owner)
                        return;
                    const draft = await claimAssignmentDraft(owner);
                    if (!draft)
                        return;
                    const requestController = new AbortController();
                    controller = requestController;
                    const lease = setInterval(() => { void renewAssignmentLease(draft).then(owned => { if (!owned)
                        requestController.abort(); }).catch(() => requestController.abort()); }, 20000);
                    try {
                        const { status, body } = await uploadAssignmentDraft(api.defaults.baseURL ?? "/api", token, draft, requestController.signal, progress => window.dispatchEvent(new CustomEvent("edunexus:offline-upload", { detail: { id: draft.id, progress } })));
                        if (stopped || useAuthStore.getState().user?.id !== owner)
                            return;
                        if (status === 403) {
                            await purgeOffline(owner, draft.classId);
                            continue;
                        }
                        if (status < 200 || status >= 300 || !body?.success || !body.data?.id) {
                            await finishAssignmentDraft(draft, { message: typeof body?.message === "string" ? body.message.slice(0, 500) : "Submission could not be confirmed.", blocked: [400, 404, 409, 413, 415, 422].includes(status) });
                            await client.invalidateQueries({ queryKey: ["assignment-submissions", draft.classId, draft.target] });
                            if (status === 401)
                                return;
                        }
                        else {
                            await finishAssignmentDraft(draft);
                            await client.invalidateQueries({ queryKey: ["assignment-submissions", draft.classId, draft.target] });
                        }
                    }
                    catch {
                        if (!stopped && useAuthStore.getState().user?.id === owner)
                            await finishAssignmentDraft(draft, { message: "Waiting for a connection. Your saved work is retained.", blocked: false });
                        return;
                    }
                    finally {
                        clearInterval(lease);
                        controller = null;
                    }
                }
            }
            catch { /* Offline work remains queued; never clear it on a failed verification. */ }
            finally {
                busy = false;
            }
        }
        const sync = () => void flush();
        const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("edunexus-offline") : null;
        channel?.addEventListener("message", () => window.dispatchEvent(new Event("edunexus:offline-data")));
        window.addEventListener("online", sync);
        window.addEventListener("edunexus:offline-data", sync);
        const timer = setInterval(sync, 15000);
        sync();
        return () => { stopped = true; controller?.abort(); channel?.close(); clearInterval(timer); window.removeEventListener("online", sync); window.removeEventListener("edunexus:offline-data", sync); };
    }, [owner, client]);
    return null;
}
