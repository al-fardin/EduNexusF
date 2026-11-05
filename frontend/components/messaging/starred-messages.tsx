"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Star, Reply } from "lucide-react";
import { messaging, type ChatMessage } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageFile } from "./message-file";
import { examError } from "@/services/exams";
export function StarredMessages({
  classId,
  thread,
  onReply,
  canSend,
}: {
  classId: string;
  thread: string;
  onReply: (message: ChatMessage) => void;
  canSend: boolean;
}) {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    const show = (event: Event) => {
      if ((event as CustomEvent).detail === thread) setOpen(true);
    };
    window.addEventListener("edunexus:open-starred", show);
    return () => window.removeEventListener("edunexus:open-starred", show);
  }, [thread]);
  const query = useInfiniteQuery({
    queryKey: ["starred-messages", user, classId, thread],
    queryFn: ({ pageParam }) =>
      messaging.history(classId, thread, pageParam, "", true),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.has_more ? last.messages[0]?.id : undefined,
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="en-starred-dialog">
        <DialogHeader>
          <DialogTitle>Starred messages</DialogTitle>
          <DialogDescription>Saved privately for you.</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <p>Loading messages…</p>
        ) : query.isError ? (
          <p role="alert">{examError(query.error)}</p>
        ) : (
          <div className="en-starred-list">
            {query.data.pages.flatMap((page) => page.messages).length === 0 && (
              <p>No starred messages.</p>
            )}
            {query.data.pages
              .flatMap((page) => page.messages)
              .map((m) => (
                <article key={m.id}>
                  <Star size={15} />
                  <div>
                    <p>{m.body}</p>
                    {m.attachment && (
                      <MessageFile
                        classId={classId}
                        thread={thread}
                        message={m}
                      />
                    )}
                    <small>{new Date(m.created_at).toLocaleString()}</small>
                  </div>
                  <button
                    className="en-icon-button"
                    disabled={!canSend}
                    aria-label="Reply to starred message"
                    onClick={() => {
                      onReply(m);
                      setOpen(false);
                    }}
                  >
                    <Reply size={19} />
                  </button>
                </article>
              ))}
            {query.hasNextPage && (
              <button
                className="en-outline-button"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load earlier
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
