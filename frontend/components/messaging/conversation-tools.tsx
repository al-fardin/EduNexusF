"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, Pin } from "lucide-react";
import { messaging, type PinnedMessage } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export function ConversationMute({ classId, thread }: {
    classId: string;
    thread: string;
}) {
    const user = useAuthStore(s => s.user?.id), client = useQueryClient();
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    const query = useQuery({ queryKey: ["conversation-preferences", user, classId, thread], queryFn: () => messaging.preferences(classId, thread), refetchInterval: 60000 });
    const muted = query.data?.muted ?? false;
    return <div className="space-y-2 border-b border-border pb-4">
  <label className="flex items-center gap-2 text-sm font-medium"><BellOff size={16}/>Message notifications
   <select aria-label="Mute conversation" className="ml-auto rounded-lg border border-border bg-background px-2 py-2" value={muted ? "muted" : "0"} disabled={busy || query.isPending || query.isError} onChange={async (e) => { const hours = Number(e.target.value); setBusy(true); setError(""); try {
        await messaging.mute(classId, thread, hours);
        await client.invalidateQueries({ queryKey: ["conversation-preferences", user, classId, thread] });
    }
    catch (err) {
        setError(examError(err));
    }
    finally {
        setBusy(false);
    } }}>
   {muted && <option value="muted" disabled>Muted</option>}<option value="0">On</option><option value="1">Mute 1 hour</option><option value="8">Mute 8 hours</option><option value="24">Mute 24 hours</option><option value="-1">Until turned on</option>
  </select></label><p className="text-xs text-muted-foreground">Messages stay in your inbox. Calls still ring.</p>
  {(error || query.isError) && <p role="alert" className="text-xs text-destructive">{error || examError(query.error)}</p>}
 </div>;
}
export function ConversationPins({ pins }: {
    pins: PinnedMessage[];
}) {
    const [open, setOpen] = useState(false);
    if (!pins.length)
        return null;
    return <><button className="en-pinned-bar" onClick={() => setOpen(true)}><Pin size={15}/><span>{pins[0].body || pins[0].file_name || "Voice message"}</span><small>{pins.length} pinned</small></button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Pinned messages</DialogTitle><DialogDescription>Shared with both conversation participants.</DialogDescription></DialogHeader><div className="space-y-3">{pins.map(pin => <article key={pin.id} className="rounded-xl border border-border p-3"><p className="whitespace-pre-wrap break-words text-sm">{pin.body || pin.file_name || "Voice message"}</p><time className="mt-2 block text-xs text-muted-foreground">{new Date(pin.pinned_at).toLocaleString()}</time></article>)}</div></DialogContent></Dialog></>;
}
