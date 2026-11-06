import { useAuthStore } from "@/store/auth-store";
import { clientId } from "./client-id";
const databaseName = "edunexus-offline-v1";
const maxBytes = 100 * 1024 * 1024;
const maxFileBytes = 15 * 1024 * 1024;
export type OfflineEntry<T = unknown> = {
    id: string;
    owner: string;
    classId: string;
    target: string;
    kind: "cache" | "material" | "draft";
    title: string;
    updatedAt: number;
    expiresAt: number;
    bytes: number;
    value: T;
};
export type AssignmentDraft = {
    answer: string;
    file: Blob | null;
    fileName: string;
    expectedVersion: number;
    requestId: string;
    revision: string;
    queued: boolean;
    state: "draft" | "queued" | "syncing" | "blocked";
    error: string;
    lease: string;
    leaseUntil: number;
    retries: number;
    nextRetryAt: number;
};
export type DraftEntry = OfflineEntry<AssignmentDraft>;
export class OfflineConflict extends Error {
    constructor() { super("Another tab changed this draft. Reload the saved draft before continuing."); }
}
function changed() { if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("edunexus:offline-data"));
    if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("edunexus-offline");
        channel.postMessage("changed");
        channel.close();
    }
} }
function assertOwner(owner: string) { if (!owner || useAuthStore.getState().user?.id !== owner)
    throw new Error("Account changed. Sign in again before opening saved work."); }
function open(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { if (typeof indexedDB === "undefined") {
    reject(new Error("Offline storage is unavailable on this device."));
    return;
} const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => { const store = request.result.createObjectStore("records", { keyPath: "id" }); store.createIndex("owner", "owner"); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error("Close other EduNexus tabs to update offline storage.")); }); }
async function transaction<T>(mode: IDBTransactionMode, owner: string | null, work: (store: IDBObjectStore, done: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
    const db = await open();
    try {
        if (owner)
            assertOwner(owner);
    }
    catch (error) {
        db.close();
        throw error;
    }
    return new Promise((resolve, reject) => { const tx = db.transaction("records", mode); let value: T; let failure: Error | null = null; const fail = (error: Error) => { failure = error; tx.abort(); }; tx.oncomplete = () => { db.close(); if (mode === "readwrite")
        changed(); resolve(value); }; tx.onabort = tx.onerror = () => { db.close(); reject(failure ?? tx.error ?? new Error("Unable to save offline work.")); }; try {
        work(tx.objectStore("records"), result => { value = result; }, fail);
    }
    catch (error) {
        fail(error instanceof Error ? error : new Error("Offline storage failed."));
    } });
}
function capacity(store: IDBObjectStore, records: OfflineEntry[], owner: string, id: string, bytes: number) { let total = records.filter(r => r.owner === owner && r.id !== id).reduce((n, r) => n + r.bytes, 0) + bytes; for (const record of records.filter(r => r.owner === owner && r.kind !== "draft" && r.id !== id).sort((a, b) => a.updatedAt - b.updatedAt)) {
    if (total <= maxBytes)
        break;
    store.delete(record.id);
    total -= record.bytes;
} if (total > maxBytes)
    throw new Error("Offline storage is full. Remove saved materials or an unused draft."); }
export const offlineKey = (owner: string, classId: string, target: string, kind: string) => `${owner}:${kind}:${classId}:${target}`;
export async function readOffline<T>(owner: string, id: string): Promise<OfflineEntry<T> | null> { return transaction("readonly", owner, (store, done) => { const request = store.get(id); request.onsuccess = () => { const record = request.result as OfflineEntry<T> | undefined; done(record?.owner === owner && (!record.expiresAt || record.expiresAt > Date.now()) ? record : null); }; }); }
export async function listOffline(owner: string): Promise<OfflineEntry[]> { return transaction("readonly", owner, (store, done) => { const request = store.index("owner").getAll(owner); request.onsuccess = () => done((request.result as OfflineEntry[]).filter(r => !r.expiresAt || r.expiresAt > Date.now()).sort((a, b) => b.updatedAt - a.updatedAt)); }); }
export async function cacheOffline<T>(entry: Omit<OfflineEntry<T>, "updatedAt" | "expiresAt">): Promise<void> {
    if (entry.bytes > maxFileBytes)
        throw new Error("This file is too large for offline storage.");
    return transaction("readwrite", entry.owner, (store, done, fail) => { const request = store.index("owner").getAll(entry.owner); request.onsuccess = () => { try {
        capacity(store, request.result, entry.owner, entry.id, entry.bytes);
        store.put({ ...entry, updatedAt: Date.now(), expiresAt: Date.now() + 7 * 86400000 });
        done();
    }
    catch (error) {
        fail(error as Error);
    } }; });
}
export async function removeOffline(owner: string, id: string, revision?: string): Promise<boolean> { return transaction("readwrite", owner, (store, done) => { const request = store.get(id); request.onsuccess = () => { const record = request.result as DraftEntry | undefined; if (record?.owner !== owner || (revision && record.value.revision !== revision)) {
    done(false);
    return;
} store.delete(id); done(true); }; }); }
// Cleanup may run after logout, when the previous owner is no longer signed in.
export async function purgeOffline(owner: string, classId?: string): Promise<void> { return transaction("readwrite", null, (store, done) => { const request = store.index("owner").openCursor(owner); request.onsuccess = () => { const cursor = request.result; if (!cursor) {
    done();
    return;
} if (!classId || cursor.value.classId === classId)
    cursor.delete(); cursor.continue(); }; }); }
export async function retainOfflineOwner(owner: string): Promise<void> { return transaction("readwrite", owner, (store, done) => { const request = store.openCursor(); request.onsuccess = () => { const cursor = request.result; if (!cursor) {
    done();
    return;
} if (cursor.value.owner !== owner)
    cursor.delete(); cursor.continue(); }; }); }
export async function saveAssignmentDraft(owner: string, classId: string, assignment: string, title: string, value: Pick<AssignmentDraft, "answer" | "file" | "fileName" | "expectedVersion" | "requestId" | "queued">, expectedRevision: string | null): Promise<DraftEntry> {
    if (value.answer.length > 20000 || (value.file?.size ?? 0) > maxFileBytes || value.expectedVersion < -1 || value.expectedVersion > 10 || value.queued && value.expectedVersion < 0 || !value.requestId)
        throw new Error("Invalid assignment draft or attachment.");
    const id = offlineKey(owner, classId, assignment, "draft");
    return transaction("readwrite", owner, (store, done, fail) => { const request = store.get(id); request.onsuccess = () => { const previous = request.result as DraftEntry | undefined; if ((previous?.value.revision ?? null) !== expectedRevision) {
        fail(new OfflineConflict());
        return;
    } if (previous?.value.queued && (previous.value.state === "queued" || previous.value.state === "syncing" && previous.value.leaseUntil > Date.now())) {
        fail(new Error("This submission is queued. Wait for confirmation before editing."));
        return;
    } const all = store.index("owner").getAll(owner); all.onsuccess = () => { try {
        const bytes = (value.file?.size ?? 0) + value.answer.length * 2;
        capacity(store, all.result, owner, id, bytes);
        const record: DraftEntry = { id, owner, classId, target: assignment, kind: "draft", title, bytes, updatedAt: Date.now(), expiresAt: 0, value: { ...value, revision: clientId(), state: value.queued ? "queued" : "draft", error: "", lease: "", leaseUntil: 0, retries: 0, nextRetryAt: 0 } };
        store.put(record);
        done(record);
    }
    catch (error) {
        fail(error as Error);
    } }; }; });
}
export async function claimAssignmentDraft(owner: string, now = Date.now()): Promise<DraftEntry | null> { return transaction("readwrite", owner, (store, done) => { const request = store.index("owner").getAll(owner); request.onsuccess = () => { const next = (request.result as DraftEntry[]).filter(r => r.kind === "draft" && r.value.queued && r.value.state !== "blocked" && r.value.leaseUntil <= now && r.value.nextRetryAt <= now).sort((a, b) => a.updatedAt - b.updatedAt)[0]; if (!next) {
    done(null);
    return;
} next.value = { ...next.value, state: "syncing", lease: clientId(), leaseUntil: now + 90000 }; store.put(next); done(next); }; }); }
export async function finishAssignmentDraft(snapshot: DraftEntry, error?: {
    message: string;
    blocked: boolean;
}): Promise<boolean> { return transaction("readwrite", snapshot.owner, (store, done) => { const request = store.get(snapshot.id); request.onsuccess = () => { const current = request.result as DraftEntry | undefined; if (!current || current.value.revision !== snapshot.value.revision || current.value.lease !== snapshot.value.lease) {
    done(false);
    return;
} if (!error)
    store.delete(current.id);
else {
    const retries = current.value.retries + 1;
    current.value = { ...current.value, state: error.blocked ? "blocked" : "queued", error: error.message, lease: "", leaseUntil: 0, retries, nextRetryAt: Date.now() + Math.min(300000, 1000 * 2 ** Math.min(retries, 8)) };
    store.put(current);
} done(true); }; }); }
export async function renewAssignmentLease(snapshot: DraftEntry): Promise<boolean> { return transaction("readwrite", snapshot.owner, (store, done) => { const request = store.get(snapshot.id); request.onsuccess = () => { const current = request.result as DraftEntry | undefined; if (!current || current.value.revision !== snapshot.value.revision || current.value.lease !== snapshot.value.lease) {
    done(false);
    return;
} current.value.leaseUntil = Date.now() + 90000; store.put(current); done(true); }; }); }
