"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { ErrorState } from "./app-feedback";
import { examError } from "@/services/exams";
export function ReasonDialog({ open, onOpenChange, title, description, onConfirm }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: (reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
    return <Dialog open={open} onOpenChange={value => { if (!busy) {
        onOpenChange(value);
        if (!value) {
            setReason("");
            setError("");
        }
    } }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); setBusy(true); setError(""); void onConfirm(reason.trim()).then(() => { onOpenChange(false); setReason(""); }).catch(e => setError(examError(e))).finally(() => setBusy(false)); }}><label className="block text-sm">Reason<textarea required minLength={3} maxLength={1000} disabled={busy} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background p-3" value={reason} onChange={e => setReason(e.target.value)}/></label>{error && <ErrorState message={error}/>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy || reason.trim().length < 3}>{busy ? "Saving…" : "Confirm"}</Button></div></form></DialogContent></Dialog>;
}
