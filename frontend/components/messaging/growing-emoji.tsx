"use client";
import { useEffect, useRef, useState } from "react";
export function GrowingEmojiButton({
  emoji,
  onSelect,
  onGrow,
  disabled = false,
  quick = false,
}: {
  emoji: string;
  onSelect: (emoji: string) => void;
  onGrow?: (emoji: string, size: number) => void;
  disabled?: boolean;
  quick?: boolean;
}) {
  const [size, setSize] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const suppress = useRef(false);
  function clear() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setSize(1);
  }
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  function begin() {
    if (disabled) return;
    started.current = performance.now();
    suppress.current = false;
    timer.current = setInterval(
      () =>
        setSize(1 + Math.min(2, (performance.now() - started.current) / 650)),
      40,
    );
  }
  function finish(cancelled = false) {
    if (!timer.current) return;
    const duration = performance.now() - started.current;
    clear();
    suppress.current = true;
    if (cancelled) return;
    const level = duration >= 1050 ? 3 : duration >= 450 ? 2 : 1;
    if ((quick || level > 1) && onGrow) onGrow(emoji, level);
    else onSelect(emoji);
  }
  return (
    <button
      type="button"
      className={quick ? "en-quick-emoji en-icon-button" : "en-growing-emoji"}
      aria-label={
        quick ? "Send thumbs up; hold to grow" : `Insert ${emoji}; hold to grow`
      }
      title="Hold to grow"
      disabled={disabled}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        origin.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerMove={(e) => {
        if (
          Math.hypot(
            e.clientX - origin.current.x,
            e.clientY - origin.current.y,
          ) > 35
        )
          finish(true);
      }}
      onPointerUp={() => finish()}
      onPointerCancel={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === " " && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " ") {
          e.preventDefault();
          finish();
        }
      }}
      onClick={() => {
        if (suppress.current) {
          suppress.current = false;
          return;
        }
        if (quick && onGrow) onGrow(emoji, 1);
        else onSelect(emoji);
      }}
    >
      <span style={{ transform: `scale(${size})` }}>{emoji}</span>
      {size > 1 && (
        <span
          role="status"
          className="en-emoji-growth-preview"
          style={{ fontSize: `${32 + size * 18}px` }}
        >
          {emoji}
        </span>
      )}
    </button>
  );
}
