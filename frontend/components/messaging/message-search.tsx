"use client";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, Reply } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { messaging, type ChatMessage } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import { MessageFile } from "./message-file";
import { examError } from "@/services/exams";
export function MessageSearch({
  classId,
  thread,
  canSend,
  onReply,
}: {
  classId: string;
  thread: string;
  canSend: boolean;
  onReply: (m: ChatMessage) => void;
}) {
  const user = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["message-search", user, classId, thread, term],
    queryFn: ({ pageParam }) =>
      messaging.history(classId, thread, pageParam, term),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.has_more ? last.messages[0]?.id : undefined,
    enabled: open && !!term,
  });
  return (
    <>
      <button
        type="button"
        className="en-icon-button"
        aria-label="Search conversation"
        onClick={() => setOpen(true)}
      >
        <Search size={19} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="en-message-search-dialog">
          <DialogHeader>
            <DialogTitle>Search conversation</DialogTitle>
            <DialogDescription>
              Find messages and shared files.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(input.trim());
            }}
          >
            <input
              aria-label="Search messages"
              className="en-message-edit-input"
              maxLength={200}
              placeholder="Search this conversation"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="en-solid-button" disabled={!input.trim()}>
              Search
            </button>
          </form>
          <div className="en-message-search-results">
            {term && query.isPending ? (
              <p>Searching…</p>
            ) : query.isError ? (
              <p role="alert">{examError(query.error)}</p>
            ) : (
              query.data?.pages
                .flatMap((p) => p.messages)
                .map((m) => (
                  <article key={m.id}>
                    <p>{m.body}</p>
                    {m.attachment && (
                      <MessageFile
                        classId={classId}
                        thread={thread}
                        message={m}
                      />
                    )}
                    <footer>
                      <time>{new Date(m.created_at).toLocaleString()}</time>
                      <button
                        className="en-icon-button"
                        aria-label="Reply to search result"
                        disabled={!canSend}
                        onClick={() => {
                          onReply(m);
                          setOpen(false);
                        }}
                      >
                        <Reply size={17} />
                      </button>
                    </footer>
                  </article>
                ))
            )}
            {query.data && query.data.pages[0]?.messages.length === 0 && (
              <p>No matching messages.</p>
            )}
            {query.hasNextPage && (
              <button
                className="en-outline-button"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load more results
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
