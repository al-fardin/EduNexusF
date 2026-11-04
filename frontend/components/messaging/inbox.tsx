"use client";
import { sendTyping } from "@/store/realtime-store";
import { MessageActions } from "./message-actions";
import { MessageSearch } from "./message-search";
import type { ChatMessage } from "@/services/messaging";
import { useRealtimeStore } from "@/store/realtime-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  X,
  Plus,
  Search,
  Send,
} from "lucide-react";
import {
  messaging,
  type Conversation,
  type MessagePage,
} from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import {
  MessageSettings,
  useMessageSettings,
} from "@/components/messaging/message-settings";
import { EmojiPicker } from "@/components/messaging/emoji-picker";
import { ChatWallpaper } from "@/components/messaging/chat-wallpaper";
import { MessageReactions } from "@/components/messaging/message-reactions";
import { MessageFile } from "@/components/messaging/message-file";
import { clientId } from "@/lib/client-id";
import { examError } from "@/services/exams";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Inbox() {
  const connected = useRealtimeStore((s) => s.connected);
  const user = useAuthStore((s) => s.user?.id);
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const client = useQueryClient();
  const [newChat, setNewChat] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const classes = useQuery({
    queryKey: ["message-classes", user],
    queryFn: messaging.classes,
    refetchInterval: connected ? false : 10000,
    refetchIntervalInBackground: false,
  });
  const requested = search.get("class") ?? "";
  const classId = (classes.data ?? []).some((c) => c.id === requested)
    ? requested
    : "";
  const selectedClass = classes.data?.find((c) => c.id === classId);
  const settings = useMessageSettings(classId);
  const thread = classId ? (search.get("thread") ?? "") : "";
  const conversations = useQuery({
    queryKey: ["conversations", user, classId],
    queryFn: () => messaging.conversations(classId),
    enabled: !!classId,
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const recipients = useQuery({
    queryKey: ["message-recipients", user, classId],
    queryFn: () => messaging.recipients(classId),
    enabled: !!classId && newChat,
  });
  function navigate(id: string, thread?: string) {
    const params = new URLSearchParams();
    if (id) params.set("class", id);
    if (thread) params.set("thread", thread);
    router.push(`${path}${params.size ? "?" + params.toString() : ""}`, {
      scroll: false,
    });
    setError("");
  }
  async function start(recipient: string) {
    setCreating(true);
    setError("");
    try {
      const result = await messaging.create(classId, recipient);
      setNewChat(false);
      setRecipientSearch("");
      await client.invalidateQueries({
        queryKey: ["conversations", user, classId],
      });
      navigate(classId, result.id);
    } catch (e) {
      setError(examError(e));
    } finally {
      setCreating(false);
    }
  }
  const peer = conversations.data?.find((c) => c.id === thread);
  return (
    <main className={`en-inbox-page${thread ? " en-mobile-chat-open" : ""}`}>
      <header className="en-inbox-heading">
        <div>
          <h1>Messages</h1>
          <p>Conversations with your class teachers and students.</p>
        </div>
      </header>
      <div
        className="en-messaging-layout"
        data-chat-theme={settings.data?.theme ?? "violet"}
        data-stage={thread ? "chat" : classId ? "threads" : "classes"}
      >
        <aside className="en-message-classes">
          <h2>Your classes</h2>
          {classes.isPending ? (
            <p className="en-panel-empty">Loading classes…</p>
          ) : classes.isError ? (
            <p role="alert" className="en-chat-error">
              {examError(classes.error)}
            </p>
          ) : classes.data?.length === 0 ? (
            <p className="en-panel-empty">
              Join or create a class to start messaging.
            </p>
          ) : (
            classes.data?.map((c) => (
              <button
                key={c.id}
                aria-pressed={c.id === classId}
                onClick={() => navigate(c.id)}
              >
                <span>
                  {c.name}
                  <small>
                    {c.role === "teacher" ? "Teaching" : "Learning"}
                  </small>
                </span>
                {c.unread > 0 ? (
                  <b className="en-sidebar-count">{c.unread}</b>
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>
            ))
          )}
        </aside>
        <section className="en-conversation-list">
          <header>
            <button
              className="en-icon-button en-mobile-only"
              aria-label="Back to message classes"
              onClick={() => navigate("")}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2>{selectedClass?.name ?? "Select a class"}</h2>
              {selectedClass && (
                <p>
                  {selectedClass.role === "student" ? "Teachers" : "Students"}
                </p>
              )}
            </div>
            {classId && <MessageSettings classId={classId} />}
            {classId && (
              <button
                className="en-icon-button"
                aria-label="New message"
                disabled={!settings.data?.can_send}
                onClick={() => setNewChat(true)}
              >
                <Plus size={21} />
              </button>
            )}
          </header>
          {settings.data && !settings.data.can_send && (
            <p className="en-chat-policy-note">
              Your teacher has paused your messages in this class.
            </p>
          )}
          {!classId ? (
            <p className="en-panel-empty">
              Choose a class to view its conversations.
            </p>
          ) : conversations.isPending ? (
            <p className="en-panel-empty">Loading conversations…</p>
          ) : conversations.isError ? (
            <p role="alert" className="en-chat-error">
              {examError(conversations.error)}
            </p>
          ) : conversations.data?.length === 0 ? (
            <div className="en-conversation-empty">
              <MessageSquare size={28} />
              <p>No conversations yet</p>
              <button
                className="en-solid-button"
                disabled={!settings.data?.can_send}
                onClick={() => setNewChat(true)}
              >
                New message
              </button>
            </div>
          ) : (
            conversations.data?.map((c) => (
              <button
                className="en-conversation-row"
                aria-pressed={c.id === thread}
                key={c.id}
                onClick={() => navigate(classId, c.id)}
              >
                <span className="en-avatar">{initials(c.name)}</span>
                <span>
                  <strong>{c.name}</strong>
                  <p>{c.last_message || "Start the conversation"}</p>
                </span>
                {c.unread > 0 && <b className="en-sidebar-count">{c.unread}</b>}
              </button>
            ))
          )}
        </section>
        {thread && classId ? (
          <ChatThread
            key={`${classId}-${thread}`}
            classId={classId}
            thread={thread}
            peer={peer}
            classroomName={selectedClass?.name ?? ""}
            onBack={() => navigate(classId)}
          />
        ) : (
          <div className="en-chat-placeholder">
            <MessageSquare size={37} />
            <h2>Your class inbox</h2>
            <p>Select a conversation or start a new message.</p>
          </div>
        )}
      </div>
      {error && !newChat && (
        <p role="alert" className="en-chat-error">
          {error}
        </p>
      )}
      <Dialog
        open={newChat}
        onOpenChange={(open) => {
          if (!creating) {
            setNewChat(open);
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>
              {selectedClass?.name} ·{" "}
              {selectedClass?.role === "student"
                ? "Choose a teacher"
                : "Choose a student"}
            </DialogDescription>
          </DialogHeader>
          <label className="en-search-field">
            <Search size={18} />
            <input
              aria-label="Search class members"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search by name"
            />
          </label>
          <div className="en-recipient-list">
            {recipients.isPending ? (
              <p>Loading class members…</p>
            ) : recipients.isError ? (
              <p role="alert">{examError(recipients.error)}</p>
            ) : (
              (recipients.data ?? [])
                .filter((r) =>
                  r.name.toLowerCase().includes(recipientSearch.toLowerCase()),
                )
                .map((r) => (
                  <button
                    disabled={creating}
                    key={r.id}
                    onClick={() => void start(r.id)}
                  >
                    <span className="en-avatar">{initials(r.name)}</span>
                    <span>
                      {r.name}
                      <small>{r.role}</small>
                    </span>
                    {creating ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <ChevronRight size={17} />
                    )}
                  </button>
                ))
            )}
            {recipients.isSuccess && recipients.data.length === 0 && (
              <p>
                No active{" "}
                {selectedClass?.role === "student" ? "teachers" : "students"} in
                this class.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="en-chat-error">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ChatThread({
  classId,
  thread,
  peer,
  classroomName,
  onBack,
}: {
  classId: string;
  thread: string;
  peer?: Conversation;
  classroomName: string;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const connected = useRealtimeStore((s) => s.connected);
  const draftKey = `edunexus:message-draft:${user}:${classId}:${thread}`;
  const [draft, setDraft] = useState(() => {
    try {
      return localStorage.getItem(draftKey)?.slice(0, 4000) ?? "";
    } catch {
      return "";
    }
  });
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [typing, setTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (draft) localStorage.setItem(draftKey, draft);
        else localStorage.removeItem(draftKey);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, draftKey]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function receive(event: Event) {
      const e = (event as CustomEvent).detail;
      if (e.conversation_id !== thread || e.user_id === user) return;
      if (timer) clearTimeout(timer);
      setTyping(!!e.typing);
      if (e.typing) timer = setTimeout(() => setTyping(false), 4500);
    }
    window.addEventListener("edunexus:typing", receive);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("edunexus:typing", receive);
      sendTyping(classId, thread, false);
      uploadAbort.current?.abort();
    };
  }, [classId, thread, user]);
  function beginReply(message: ChatMessage) {
    setReply(message);
    resetRequest();
    requestAnimationFrame(() => textarea.current?.focus());
  }
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const settings = useMessageSettings(classId);
  const override = useQuery({
    queryKey: ["message-theme", user, classId, thread],
    queryFn: () => messaging.theme(classId, thread),
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const canSend = settings.data?.can_send ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const request = useRef<string | null>(null);
  function resetRequest(){request.current=null}
  const viewport = useRef<HTMLDivElement>(null);
  const read = useRef("");
  const key = ["messages", user, classId, thread];
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => messaging.history(classId, thread, pageParam),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.has_more ? last.messages[0]?.id : undefined,
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return [...(query.data?.pages ?? [])]
      .reverse()
      .flatMap((p) => p.messages)
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
  }, [query.data?.pages]);
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (last && atBottom) {
      const box = viewport.current;
      if (box) box.scrollTop = box.scrollHeight;
    }
  }, [last, atBottom]);
  useEffect(() => {
    function mark() {
      if (
        !last ||
        !atBottom ||
        document.visibilityState !== "visible" ||
        read.current === last.id
      )
        return;
      read.current = last.id;
      void messaging
        .read(classId, thread, last.id)
        .then(() =>
          Promise.all([
            client.invalidateQueries({ queryKey: ["message-unread", user] }),
            client.invalidateQueries({ queryKey: ["message-classes", user] }),
            client.invalidateQueries({
              queryKey: ["conversations", user, classId],
            }),
          ]),
        )
        .catch(() => {
          read.current = "";
        });
    }
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [last, atBottom, classId, thread, client, user]);
  async function loadEarlier() {
    const box = viewport.current;
    const previousHeight = box?.scrollHeight ?? 0;
    const previousTop = box?.scrollTop ?? 0;
    setAtBottom(false);
    await query.fetchNextPage();
    requestAnimationFrame(() => {
      if (box) box.scrollTop = previousTop + box.scrollHeight - previousHeight;
    });
  }
  async function send() {
    if (busy || (!draft.trim() && !file) || !canSend) return;
    setBusy(true);
    setError("");
    uploadAbort.current = new AbortController();
    setUploadProgress(0);
    request.current ??= clientId();
    try {
      const sent = await messaging.send(
        classId,
        thread,
        draft.trim(),
        request.current,
        file,
        reply?.id ?? "",
        {
          signal: uploadAbort.current.signal,
          onUploadProgress: (e) =>
            setUploadProgress(
              Math.min(
                100,
                Math.round((e.loaded / (e.total || file?.size || 1)) * 100),
              ),
            ),
        },
      );
      client.setQueryData<InfiniteData<MessagePage, string>>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p, i) =>
                i === 0
                  ? {
                      ...p,
                      messages: p.messages.some((m) => m.id === sent.id)
                        ? p.messages
                        : [...p.messages, sent],
                    }
                  : p,
              ),
            }
          : old,
      );
      setDraft("");
      setReply(null);
      sendTyping(classId, thread, false);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      resetRequest();
      setAtBottom(true);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({
        queryKey: ["conversations", user, classId],
      });
    } catch (e) {
      setError(
        uploadAbort.current?.signal.aborted
          ? "Upload canceled. Your draft is ready to retry."
          : examError(e),
      );
    } finally {
      setBusy(false);
      uploadAbort.current = null;
    }
  }
  return (
    <section
      className="en-message-thread"
      aria-label="Conversation"
      data-chat-theme={override.data?.theme || settings.data?.theme || "violet"}
    >
      <header>
        <button
          className="en-icon-button en-mobile-only"
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <ArrowLeft size={21} />
        </button>
        <span className="en-avatar">
          {initials(peer?.name ?? "Conversation")}
        </span>
        <div>
          <h2>{peer?.name ?? "Conversation"}</h2>
          <p>{classroomName}</p>
        </div>
        <MessageSearch
          classId={classId}
          thread={thread}
          canSend={canSend}
          onReply={beginReply}
        />
        <MessageSettings
          classId={classId}
          thread={thread}
          peerId={peer?.role === "student" ? peer.peer_id : undefined}
        />
      </header>
      <div className="en-chat-scroll-area">
        <ChatWallpaper
          theme={override.data?.theme || settings.data?.theme || "violet"}
        />
        <div
          className="en-chat-history"
          ref={viewport}
          onScroll={(e) => {
            const box = e.currentTarget;
            setAtBottom(
              box.scrollHeight - box.scrollTop - box.clientHeight < 100,
            );
          }}
          aria-live="polite"
          aria-relevant="additions text"
        >
          {query.hasNextPage && (
            <button
              className="en-chat-load"
              disabled={query.isFetchingNextPage}
              onClick={() => void loadEarlier()}
            >
              {query.isFetchingNextPage ? "Loading…" : "Load earlier messages"}
            </button>
          )}
          {query.isPending ? (
            <p className="en-panel-empty">Loading messages…</p>
          ) : query.isError ? (
            <p role="alert" className="en-chat-error">
              {examError(query.error)}
            </p>
          ) : messages.length === 0 ? (
            <p className="en-panel-empty">
              Start a conversation with {peer?.name ?? "this class member"}.
            </p>
          ) : (
            messages.map((m) => (
              <MessageActions
                key={m.id}
                classId={classId}
                thread={thread}
                message={m}
                canSend={canSend}
                onReply={beginReply}
              >
                {m.reply && (
                  <blockquote className="en-chat-reply">
                    <strong>
                      {m.reply.sender_id === user
                        ? "You"
                        : peer?.name || "Class member"}
                    </strong>
                    <p>{m.reply.body}</p>
                  </blockquote>
                )}
                {m.attachment && (
                  <MessageFile classId={classId} thread={thread} message={m} />
                )}
                {m.body && <p>{m.body}</p>}
                <time dateTime={m.created_at}>
                  {new Date(m.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {m.edited_at && " · Edited"}
                  {m.sender_id === user &&
                    !m.deleted_at &&
                    (BigInt(m.id) <=
                    BigInt(query.data?.pages[0]?.peer_last_read || "0")
                      ? " · Seen"
                      : " · Sent")}
                </time>
                {!m.deleted_at && (
                  <MessageReactions
                    classId={classId}
                    thread={thread}
                    message={m}
                    disabled={!canSend}
                  />
                )}
              </MessageActions>
            ))
          )}
        </div>
      </div>
      {!atBottom && last && (
        <button
          className="en-chat-load"
          onClick={() => {
            const box = viewport.current;
            if (box) box.scrollTop = box.scrollHeight;
            setAtBottom(true);
          }}
        >
          Latest messages ↓
        </button>
      )}
      {typing && (
        <p className="en-chat-typing" role="status">
          {peer?.name || "Class member"} is typing
          <span aria-hidden="true">…</span>
        </p>
      )}
      {error && (
        <p role="alert" className="en-chat-error">
          {error}
        </p>
      )}
      {settings.isError && (
        <p role="alert" className="en-chat-error">
          {examError(settings.error)}
        </p>
      )}
      {settings.data && !canSend && (
        <p className="en-chat-policy-note" role="status">
          Your teacher has paused your messages. You can still read this
          conversation.
        </p>
      )}
      {reply && (
        <div className="en-chat-reply-draft">
          <div>
            <strong>
              Replying to{" "}
              {reply.sender_id === user
                ? "yourself"
                : peer?.name || "class member"}
            </strong>
            <p>{reply.body || reply.attachment?.name}</p>
          </div>
          <button
            type="button"
            className="en-icon-button"
            aria-label="Cancel reply"
            disabled={busy}
            onClick={() => {
              setReply(null);
              resetRequest();
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {busy && file && (
        <div className="en-chat-upload" role="status">
          <progress max={100} value={uploadProgress} />
          <span>
            {uploadProgress < 100
              ? `Uploading ${uploadProgress}%`
              : "Confirming message…"}
          </span>
          <button
            type="button"
            className="en-outline-button"
            onClick={() => uploadAbort.current?.abort()}
          >
            Cancel
          </button>
        </div>
      )}
      {file && (
        <div className="en-chat-file-draft">
          <Paperclip size={16} />
          <span>
            {file.name} · {Math.max(1, Math.round(file.size / 1024))} KB
          </span>
          <button
            type="button"
            className="en-icon-button"
            aria-label="Remove attachment"
            disabled={busy}
            onClick={() => {
              setFile(null);
              resetRequest();
              if (fileInput.current) fileInput.current.value = "";
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <form
        className="en-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="en-compose-tools">
          <EmojiPicker
            disabled={busy || !canSend || query.isError}
            onSelect={(emoji) => {
              const start = textarea.current?.selectionStart ?? draft.length;
              const end = textarea.current?.selectionEnd ?? start;
              const next = draft.slice(0, start) + emoji + draft.slice(end);
              if (next.length > 4000) return;
              setDraft(next);
              resetRequest();
              requestAnimationFrame(() => {
                textarea.current?.focus();
                textarea.current?.setSelectionRange(
                  start + emoji.length,
                  start + emoji.length,
                );
              });
            }}
          />
          <button
            type="button"
            className="en-icon-button"
            aria-label="Attach file"
            disabled={busy || !canSend || query.isError}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip size={22} />
          </button>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            aria-label="Message attachment"
            disabled={busy || !canSend}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (!selected) return;
              if (selected.size === 0 || selected.size > 10 * 1024 * 1024) {
                setError("Choose a file between 1 byte and 10 MB.");
                e.target.value = "";
                return;
              }
              setError("");
              setFile(selected);
              resetRequest();
            }}
          />
        </div>
        <textarea
          ref={textarea}
          aria-label="Message"
          placeholder="Write a message…"
          maxLength={4000}
          rows={2}
          value={draft}
          disabled={busy || query.isError || !canSend}
          onChange={(e) => {
            setDraft(e.target.value);
            sendTyping(classId, thread, !!e.target.value.trim());
            resetRequest();
          }}
        />
        <button
          className="en-solid-button"
          type="submit"
          disabled={
            busy || (!draft.trim() && !file) || query.isError || !canSend
          }
          aria-label="Send message"
        >
          {busy ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </section>
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}
