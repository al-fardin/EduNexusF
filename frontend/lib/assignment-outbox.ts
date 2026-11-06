import axios from "axios";
import type { DraftEntry } from "./offline-store";
// Use an isolated transport: a concurrent login must never replace this owner's
// bearer token through the application's mutable authentication interceptor.
export async function uploadAssignmentDraft(base: string, token: string, draft: DraftEntry, signal: AbortSignal, onProgress: (progress: number) => void): Promise<{
    status: number;
    body: {
        success?: boolean;
        data?: {
            id?: string;
        };
        message?: string;
    } | null;
}> {
    const form = new FormData();
    form.append("answer", draft.value.answer);
    form.append("request_id", draft.value.requestId);
    form.append("expected_version", String(draft.value.expectedVersion));
    if (draft.value.file)
        form.append("file", draft.value.file, draft.value.fileName);
    try {
        const response = await axios.post(`${base.replace(/\/$/, "")}/classrooms/${encodeURIComponent(draft.classId)}/assignments/${encodeURIComponent(draft.target)}/submit`, form, { headers: { Authorization: `Bearer ${token}` }, signal, timeout: 600000, onUploadProgress: event => onProgress(Math.min(100, Math.round(event.loaded / (event.total || draft.bytes || 1) * 100))) });
        return { status: response.status, body: response.data };
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response)
            return { status: error.response.status, body: error.response.data };
        throw error;
    }
}
