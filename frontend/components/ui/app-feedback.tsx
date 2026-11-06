"use client";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
export function EmptyState({ title, description, action }: {
    title: string;
    description?: string;
    action?: ReactNode;
}) { return <div className="rounded-2xl border border-dashed border-border p-6 text-center"><h3 className="text-sm font-semibold">{title}</h3>{description && <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}{action && <div className="mt-4 flex justify-center">{action}</div>}</div>; }
export function ErrorState({ message, onRetry, busy = false }: {
    message: string;
    onRetry?: () => void;
    busy?: boolean;
}) { return <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm"><p>{message}</p>{onRetry && <Button type="button" variant="outline" className="mt-2 rounded-xl" disabled={busy} onClick={onRetry}>{busy ? "Retrying…" : "Retry"}</Button>}</div>; }
export function ConfirmAction({ open, onOpenChange, title, description, busy = false, onConfirm }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    busy?: boolean;
    onConfirm: () => void;
}) { return <Dialog open={open} onOpenChange={value => { if (!busy)
    onOpenChange(value); }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={onConfirm}>{busy ? "Working…" : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>; }
export function UploadState({ progress, onCancel }: {
    progress: number;
    onCancel?: () => void;
}) { return <div role="status" className="en-chat-upload"><progress aria-label="Upload progress" value={progress} max={100}/><span>{progress < 100 ? `Uploading ${progress}%` : "Confirming…"}</span>{onCancel && <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel upload</Button>}</div>; }
