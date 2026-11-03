"use client";
import { useState } from "react";
import { LoaderCircle, SmilePlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { messaging, type ChatMessage } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
const emojiChoices = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🎉",
  "🔥",
  "✅",
  "👀",
];
export function MessageReactions({
  classId,
  thread,
  message,
  disabled,
}: {
  classId: string;
  thread: string;
  message: ChatMessage;
  disabled: boolean;
}) {
  const user = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reactions = message.reactions ?? [];
  const mine = reactions.find((r) => r.user_id === user)?.emoji;
  const counts = new Map<string, number>();
  for (const r of reactions)
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  async function react(emoji: string) {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      await messaging.react(
        classId,
        thread,
        message.id,
        emoji === mine ? "" : emoji,
      );
      setOpen(false);
      await client.invalidateQueries({
        queryKey: ["messages", user, classId, thread],
      });
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="en-message-reactions">
      {[...counts].map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          className="en-reaction-count"
          aria-label={`${emoji}, ${count} reaction${count === 1 ? "" : "s"}${mine === emoji ? ", including yours" : ""}`}
          aria-pressed={mine === emoji}
          disabled={busy || disabled}
          onClick={() => void react(emoji)}
        >
          {emoji}
          <span>{count}</span>
        </button>
      ))}
      <button
        type="button"
        className="en-react-trigger"
        aria-label="React to this message"
        aria-expanded={open}
        disabled={busy || disabled}
        onClick={(e) => {
          setBelow(e.currentTarget.getBoundingClientRect().top < 240);
          setOpen((v) => !v);
        }}
      >
        {busy ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <SmilePlus size={17} />
        )}
      </button>
      {open && !disabled && (
        <div
          className="en-reaction-picker"
          data-below={below}
          role="dialog"
          aria-label="Choose a reaction"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <header>
            <span>React</span>
            <button
              type="button"
              aria-label="Close reactions"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </header>
          <div>
            {emojiChoices.map((emoji) => (
              <button
                type="button"
                key={emoji}
                disabled={busy}
                aria-label={`React ${emoji}`}
                aria-pressed={mine === emoji}
                onClick={() => void react(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="en-chat-error">
          {error}
        </p>
      )}
    </div>
  );
}
