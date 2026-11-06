"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
  Star,
  Copy,
  Pin,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { messaging, type ChatMessage } from "@/services/messaging";
import { examError } from "@/services/exams";
import { useAuthStore } from "@/store/auth-store";
export function MessageActions({
  classId,
  thread,
  message,
  canSend,
  onReply,
  children,
  starred = false,
  pinned = false,
}: {
  classId: string;
  thread: string;
  message: ChatMessage;
  canSend: boolean;
  onReply: (message: ChatMessage) => void;
  children: ReactNode;
  starred?: boolean;
  pinned?: boolean;
}) {
  const user = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const [body, setBody] = useState(message.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const gesture = useRef(false);
  const [drag, setDrag] = useState(0);
  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
    },
    [],
  );
  const own = message.sender_id === user;
  function clear() {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  }
  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await Promise.all([
        client.invalidateQueries({queryKey:["conversation-pins",user,classId,thread]}),
        client.invalidateQueries({
          queryKey: ["messages", user, classId, thread],
        }),
        client.invalidateQueries({
          queryKey: ["conversations", user, classId],
        }),
        client.invalidateQueries({
          queryKey: ["message-stars", user, classId, thread],
        }),
        client.invalidateQueries({
          queryKey: ["starred-messages", user, classId, thread],
        }),
      ]);
      setEdit(false);
      setRemove(false);
      setOpen(false);
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`en-chat-bubble${own ? " en-chat-own" : ""}${message.deleted_at ? " en-chat-deleted" : ""}${message.kind === "emoji" && !message.deleted_at ? " en-chat-emoji" : ""}${drag > 0 ? " en-chat-dragging" : ""}`}
      style={{ transform: drag ? `translateX(${drag}px)` : undefined }}
      onContextMenu={(e) => {
        if (!message.deleted_at) {
          e.preventDefault();
          setOpen(true);
        }
      }}
      onPointerDown={(e) => {
        if (
          (e.pointerType !== "touch" && e.pointerType !== "pen") ||
          message.deleted_at ||
          (e.target as HTMLElement).closest("button,a,audio,video,input")
        )
          return;
        clear();
        gesture.current = true;
        start.current = { x: e.clientX, y: e.clientY };
        hold.current = setTimeout(() => {
          gesture.current = false;
          setDrag(0);
          setOpen(true);
        }, 500);
      }}
      onPointerMove={(e) => {
        if (!gesture.current) return;
        const dx = e.clientX - start.current.x,
          dy = e.clientY - start.current.y;
        if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
          gesture.current = false;
          setDrag(0);
          clear();
          return;
        }
        if (canSend && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.4)
          setDrag(Math.min(90, dx * 0.7));
        if (
          Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) >
          10
        )
          clear();
      }}
      onPointerUp={(e) => {
        if (
          gesture.current &&
          canSend &&
          e.clientX - start.current.x >= 72 &&
          Math.abs(e.clientY - start.current.y) < 40
        ) {
          onReply(message);
          navigator.vibrate?.(12);
        }
        gesture.current = false;
        setDrag(0);
        clear();
      }}
      onPointerCancel={() => {
        gesture.current = false;
        setDrag(0);
        clear();
      }}
    >
      <span
        className={`en-swipe-reply-indicator${drag >= 50 ? " is-ready" : ""}`}
        aria-hidden="true"
      >
        <Reply size={21} />
      </span>
      {children}
      {starred && !message.deleted_at && (
        <Star
          className="en-message-star"
          size={12}
          fill="currentColor"
          aria-label="Starred message"
        />
      )}
      {!message.deleted_at && (
        <button
          className="en-message-more"
          type="button"
          aria-label="Message actions"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={16} />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="en-message-actions-dialog">
          <DialogHeader>
            <DialogTitle>Message</DialogTitle>
            <DialogDescription>
              {message.body || message.attachment?.name}
            </DialogDescription>
          </DialogHeader>
          <button
            className="en-message-action-row"
            disabled={!canSend}
            onClick={() => {
              onReply(message);
              setOpen(false);
            }}
          >
            <Reply size={18} />
            Reply
          </button>
          <button
            className="en-message-action-row"
            disabled={busy||(!pinned&&!canSend)}
            onClick={()=>void save(()=>messaging.pin(classId,thread,message.id,!pinned))}
          >
            <Pin size={18}/>{pinned?"Unpin message":"Pin for both participants"}
          </button>
          <button
            className="en-message-action-row"
            disabled={busy}
            onClick={() =>
              void save(() =>
                messaging.star(classId, thread, message.id, !starred),
              )
            }
          >
            <Star size={18} fill={starred ? "currentColor" : "none"} />
            {starred ? "Unstar message" : "Star message"}
          </button>
          {!!message.body && (
            <button
              className="en-message-action-row"
              onClick={async () => {
                try {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(message.body);
                  } else {
                    const element = document.createElement("textarea");
                    element.value = message.body;
                    document.body.appendChild(element);
                    element.select();
                    const copied = document.execCommand("copy");
                    element.remove();
                    if (!copied) throw Error("Copy unavailable");
                  }
                  setOpen(false);
                } catch {
                  setError("Could not copy this message.");
                }
              }}
            >
              <Copy size={18} />
              Copy text
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          {own && (
            <>
              {message.kind !== "voice" && (
                <button
                  className="en-message-action-row"
                  disabled={!canSend}
                  onClick={() => {
                    setBody(message.body);
                    setOpen(false);
                    setEdit(true);
                    setError("");
                  }}
                >
                  <Pencil size={18} />
                  Edit message
                </button>
              )}
              <button
                className="en-message-action-row text-destructive"
                onClick={() => {
                  setOpen(false);
                  setRemove(true);
                  setError("");
                }}
              >
                <Trash2 size={18} />
                Delete for everyone
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={edit || remove}
        onOpenChange={(value) => {
          if (!busy && !value) {
            setEdit(false);
            setRemove(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit ? "Edit message" : "Delete message?"}
            </DialogTitle>
            <DialogDescription>
              {edit
                ? "Changes will be visible to both participants."
                : "This removes the message and its attachment for both participants."}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <textarea
              aria-label="Edit message"
              rows={4}
              maxLength={4000}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              className="en-message-edit-input"
            />
          )}
          {error && (
            <p role="alert" className="en-chat-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              className="en-outline-button"
              disabled={busy}
              onClick={() => {
                setEdit(false);
                setRemove(false);
              }}
            >
              Cancel
            </button>
            <button
              className="en-solid-button"
              disabled={busy || (edit && !body.trim() && !message.attachment)}
              onClick={() =>
                void save(() =>
                  edit
                    ? messaging.edit(classId, thread, message.id, body)
                    : messaging.remove(classId, thread, message.id),
                )
              }
            >
              {busy ? "Saving…" : edit ? "Save changes" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
