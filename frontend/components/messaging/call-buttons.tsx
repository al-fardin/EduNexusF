"use client";
import { useState, useEffect } from "react";
import {
  Phone,
  Video,
  History,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callControls, useCallStore } from "@/store/call-store";
import { calling } from "@/services/calling";
import { clientId } from "@/lib/client-id";
import { useAuthStore } from "@/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function CallButtons({
  thread,
  disabled,
}: {
  thread: string;
  disabled: boolean;
}) {
  const phase = useCallStore((s) => s.phase);
  const [open, setOpen] = useState(false);
  const [session] = useState(clientId);
  const user = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["call-history", user, thread],
    queryFn: () => calling.history(session, thread),
    enabled: open,
  });
  useEffect(() => {
    const refresh = () =>
      void client.invalidateQueries({ queryKey: ["call-history"] });
    window.addEventListener("edunexus:call-history", refresh);
    return () => window.removeEventListener("edunexus:call-history", refresh);
  }, [client]);
  useEffect(() => {
    const show = (event: Event) => {
      if ((event as CustomEvent).detail === thread) setOpen(true);
    };
    window.addEventListener("edunexus:open-call-history", show);
    return () => window.removeEventListener("edunexus:open-call-history", show);
  }, [thread]);
  const busy = phase !== "idle" && phase !== "ended";
  return (
    <div className="en-chat-call-buttons">
      <button
        className="en-icon-button"
        aria-label="Start audio call"
        disabled={disabled || busy}
        onClick={() => void callControls()?.start(thread, "audio")}
      >
        <Phone size={19} />
      </button>
      <button
        className="en-icon-button"
        aria-label="Start video call"
        disabled={disabled || busy}
        onClick={() => void callControls()?.start(thread, "video")}
      >
        <Video size={21} />
      </button>
      <button
        className="en-icon-button en-call-history-button"
        aria-label="Call history"
        onClick={() => setOpen(true)}
      >
        <History size={19} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="en-call-history">
          <DialogHeader>
            <DialogTitle>Call history</DialogTitle>
            <DialogDescription>
              Audio and video calls in this conversation.
            </DialogDescription>
          </DialogHeader>
          {history.isPending ? (
            <p role="status">Loading calls…</p>
          ) : history.isError ? (
            <p role="alert">{examError(history.error)}</p>
          ) : history.data?.length === 0 ? (
            <p>No calls yet.</p>
          ) : (
            history.data?.map((call) => (
              <article key={call.id}>
                {call.reason === "missed" || call.reason === "declined" ? (
                  <PhoneMissed className="text-destructive" size={19} />
                ) : call.caller_id === user ? (
                  <PhoneOutgoing size={19} />
                ) : (
                  <PhoneIncoming size={19} />
                )}
                <div>
                  <strong>
                    {call.media === "video" ? "Video call" : "Audio call"}
                  </strong>
                  <small>
                    {new Date(call.created_at).toLocaleString()} ·{" "}
                    {call.reason || call.state}
                    {call.connected_at && call.ended_at
                      ? ` · ${Math.max(0, Math.round((new Date(call.ended_at).getTime() - new Date(call.connected_at).getTime()) / 1000))}s`
                      : ""}
                  </small>
                </div>
                <button
                  className="en-icon-button"
                  aria-label={`Call again by ${call.media}`}
                  disabled={disabled || busy}
                  onClick={() => {
                    setOpen(false);
                    void callControls()?.start(thread, call.media);
                  }}
                >
                  {call.media === "video" ? (
                    <Video size={18} />
                  ) : (
                    <Phone size={18} />
                  )}
                </button>
              </article>
            ))
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
