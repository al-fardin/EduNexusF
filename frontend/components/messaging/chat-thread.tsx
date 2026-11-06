"use client";
import { sendTyping } from "@/store/realtime-store";
import { MessageActions } from "./message-actions";
import { MessageSearch } from "./message-search";
import { CallButtons } from "./call-buttons";
import { StarredMessages } from "./starred-messages";
import { GrowingEmojiButton } from "./growing-emoji";
import { VoiceRecorder } from "./voice-recorder";
import { ArrowLeft, LoaderCircle, Paperclip, X, Send } from "lucide-react";
import { type Conversation } from "@/services/messaging";
import { MessageSettings } from "@/components/messaging/message-settings";
import { EmojiPicker } from "@/components/messaging/emoji-picker";
import { ChatWallpaper } from "@/components/messaging/chat-wallpaper";
import { MessageReactions } from "@/components/messaging/message-reactions";
import { MessageFile } from "@/components/messaging/message-file";
import { examError } from "@/services/exams";
import { useChatThread } from "./use-chat-thread";
import { initials } from "./message-utils";

export function ChatThread({
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
  const {
    removeAttachment,
    prepareVoice,
    user,
    draft,
    setDraft,
    reply,
    setReply,
    setEmojiSize,
    setEmojiDraft,
    voiceDuration,
    voicePreview,
    callPhase,
    stars,
    clearVoice,
    typing,
    uploadProgress,
    uploadAbort,
    beginReply,
    file,
    setFile,
    fileInput,
    textarea,
    settings,
    override,
    canSend,
    busy,
    error,
    setError,
    atBottom,
    setAtBottom,
    resetRequest,
    viewport,
    query,
    messages,
    last,
    loadEarlier,
    send,
  } = useChatThread(classId, thread);

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
        <CallButtons thread={thread} disabled={!canSend || !peer} />
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
      <StarredMessages
        classId={classId}
        thread={thread}
        canSend={canSend}
        onReply={beginReply}
      />
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
                starred={stars.data?.includes(m.id)}
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
                {m.body && (
                  <p
                    data-emoji-size={m.emoji_size}
                    className={
                      m.kind === "emoji" && !m.deleted_at
                        ? "en-big-emoji"
                        : undefined
                    }
                    style={
                      m.kind === "emoji" && !m.deleted_at
                        ? { fontSize: `${32 + 20 * m.emoji_size}px` }
                        : undefined
                    }
                  >
                    {m.body}
                  </p>
                )}
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
            {voiceDuration
              ? `Voice message · ${Math.floor(voiceDuration / 60000)}:${(Math.floor(voiceDuration / 1000) % 60).toString().padStart(2, "0")}`
              : file.name}{" "}
            · {Math.max(1, Math.round(file.size / 1024))} KB
          </span>
          <button
            type="button"
            className="en-icon-button"
            aria-label="Remove attachment"
            disabled={busy}
            onClick={removeAttachment}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {voicePreview && (
        <audio
          className="en-voice-draft-audio"
          controls
          src={voicePreview}
          aria-label="Preview voice recording"
        />
      )}
      <form
        className="en-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="en-compose-tools">
          <VoiceRecorder
            disabled={
              busy ||
              !canSend ||
              query.isError ||
              !!file ||
              (callPhase !== "idle" && callPhase !== "ended")
            }
            onError={setError}
            onReady={prepareVoice}
          />
          <EmojiPicker
            disabled={busy || !canSend || query.isError || !!voiceDuration}
            onGrow={
              !file
                ? (emoji, size) => {
                    resetRequest();
                    void send({ body: emoji, size });
                  }
                : undefined
            }
            onSelect={(emoji) => {
              setEmojiDraft(false);
              setEmojiSize(1);
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
              clearVoice();
              setEmojiDraft(false);
              setEmojiSize(1);
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
          disabled={busy || query.isError || !canSend || !!voiceDuration}
          onChange={(e) => {
            setDraft(e.target.value);
            setEmojiDraft(false);
            setEmojiSize(1);
            sendTyping(classId, thread, !!e.target.value.trim());
            resetRequest();
          }}
        />
        {!draft.trim() && !file && !busy ? (
          <GrowingEmojiButton
            emoji="👍"
            quick
            disabled={!canSend || query.isError}
            onSelect={() => {}}
            onGrow={(emoji, size) => {
              resetRequest();
              void send({ body: emoji, size });
            }}
          />
        ) : (
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
        )}
      </form>
    </section>
  );
}
