"use client";
import { useState } from "react";
import { Smile, X } from "lucide-react";
const groups = {
  Faces: [
    "😀",
    "😊",
    "🙂",
    "😂",
    "🥰",
    "🤔",
    "😅",
    "😎",
    "😔",
    "😮",
    "🙌",
    "👍",
    "👏",
    "🙏",
    "🤝",
    "💪",
  ],
  Study: [
    "📚",
    "📖",
    "📝",
    "✏️",
    "💻",
    "📎",
    "📌",
    "📅",
    "⏰",
    "🎓",
    "🧠",
    "💡",
    "🔍",
    "🧪",
    "📊",
    "🏆",
  ],
  Symbols: [
    "✅",
    "❌",
    "❓",
    "❗",
    "❤️",
    "💜",
    "⭐",
    "🔥",
    "🎉",
    "💯",
    "🔔",
    "📣",
    "➡️",
    "🔄",
    "☑️",
    "✨",
  ],
};
export function EmojiPicker({
  onSelect,
  disabled,
}: {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<keyof typeof groups>("Faces");
  return (
    <div className="en-emoji-control">
      <button
        type="button"
        className="en-icon-button"
        aria-label="Add emoji"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile size={22} />
      </button>
      {open && !disabled && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          className="en-emoji-picker"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <header>
            <span>Emoji</span>
            <button
              type="button"
              aria-label="Close emoji picker"
              className="en-icon-button"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <div className="en-emoji-tabs">
            {Object.keys(groups).map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={name === group}
                onClick={() => setGroup(name as keyof typeof groups)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="en-emoji-grid">
            {groups[group].map((emoji) => (
              <button
                type="button"
                key={emoji}
                aria-label={`Insert ${emoji}`}
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
