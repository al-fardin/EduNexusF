"use client";

import { useEffect, useRef, type PointerEvent } from "react";

/** Pointer-only decoration: never intercept clicks, scrolling or touch gestures. */
export function useCardLight() {
  const frame = useRef<number | null>(null);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function reset(event: PointerEvent<HTMLElement>) {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    for (const name of ["--light-x", "--light-y", "--tilt-x", "--tilt-y"]) {
      event.currentTarget.style.removeProperty(name);
    }
  }

  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const element = event.currentTarget;
    if (element.closest('[data-motion="paused"]')) return;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty("--light-x", `${x * 100}%`);
      element.style.setProperty("--light-y", `${y * 100}%`);
      element.style.setProperty("--tilt-x", `${(0.5 - y) * 4}deg`);
      element.style.setProperty("--tilt-y", `${(x - 0.5) * 4}deg`);
      frame.current = null;
    });
  }

  return { onPointerMove: move, onPointerLeave: reset, onPointerCancel: reset };
}
