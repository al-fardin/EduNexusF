"use client";
import { ChatThread } from "./chat-thread";
import { useRealtimeStore } from "@/store/realtime-store";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import { messaging } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import {
  MessageSettings,
  useMessageSettings,
} from "@/components/messaging/message-settings";
import { examError } from "@/services/exams";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials } from "./message-utils";

export function Inbox() {
  const connected = useRealtimeStore((s) => s.connected);
  const user = useAuthStore((s) => s.user?.id);
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const client = useQueryClient();
  const [inboxSearch,setInboxSearch]=useState("");
  const [onlyUnread,setOnlyUnread]=useState(false);
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
  const visibleConversations=(conversations.data??[]).filter(c=>(!onlyUnread||c.unread>0)&&(c.name+" "+c.last_message).toLowerCase().includes(inboxSearch.toLowerCase()));
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
          {classId&&<div className="space-y-2 border-b border-border p-3"><input aria-label="Search conversations" placeholder="Search names or latest message" value={inboxSearch} onChange={e=>setInboxSearch(e.target.value)} className="w-full min-w-0 rounded-xl border border-border bg-card p-2 text-sm"/><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyUnread} onChange={e=>setOnlyUnread(e.target.checked)}/>Unread only</label></div>}
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
          ) : visibleConversations.length === 0 ? (
            <div className="en-conversation-empty">
              <MessageSquare size={28} />
              <p>{inboxSearch||onlyUnread?"No matching conversations":"No conversations yet"}</p>
              <button
                className="en-solid-button"
                disabled={!settings.data?.can_send}
                onClick={() => setNewChat(true)}
              >
                New message
              </button>
            </div>
          ) : (
            visibleConversations.map((c) => (
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
