"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type ApiStatus = { active: number; writes: number };

/**
 * Small, non-blocking progress card for requests made via the shared API client.
 * Keeps feedback visible briefly without delaying the actual server request,
 * especially important during timed examinations.
 */
export function NetworkFeedback() {
  const [visible, setVisible] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let visibleSince = 0;
    let shown = false;

    const onNetwork = (event: Event) => {
      const detail = (event as CustomEvent<ApiStatus>).detail;
      if (!detail) return;
      if (hideTimer) clearTimeout(hideTimer);
      setWriting(detail.writes > 0);
      if (detail.active > 0) {
        if (!shown && !showTimer) {
          showTimer = setTimeout(() => {
            showTimer = undefined;
            shown = true;
            visibleSince = Date.now();
            setVisible(true);
          }, 0);
        }
      } else {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = undefined;
        }
        if (shown) {
          // Minimum feedback duration is visual only; answers are saved immediately.
          const remaining = Math.max(0, 580 - (Date.now() - visibleSince));
          hideTimer = setTimeout(() => {
            shown = false;
            setVisible(false);
          }, remaining);
        }
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button:not(:disabled)");
      if (!button) return;
      // Feedback on every actual button click, without blocking interaction.
      button.classList.remove("en-press-feedback");
      void button.offsetWidth;
      button.classList.add("en-press-feedback");
      setTimeout(() => button.classList.remove("en-press-feedback"), 440);
    };

    window.addEventListener("edunexus:api-status", onNetwork);
    document.addEventListener("click", onClick, true);
    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener("edunexus:api-status", onNetwork);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="en-network-feedback" role="status" aria-live="polite" aria-label={writing ? "Saving changes" : "Loading data"}>
      <span className="en-feedback-mark"><LoaderCircle size={19} className="en-spin" /></span>
      <div className="en-feedback-copy">
        <strong>{writing ? "Saving your changes…" : "Preparing your view…"}</strong>
        <span>{writing ? "Keeping your work safe" : "Fetching the latest classroom data"}</span>
        <div className="en-feedback-shimmer" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
