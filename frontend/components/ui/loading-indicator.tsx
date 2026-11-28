import { OrbitalRing } from "@/components/visual/orbital-ring";
import { BrandMark } from "@/components/layout/brand-mark";
import type { CSSProperties } from "react";

/** Shared loading artwork; compact indicators remain inside the active control. */
export function LoadingIcon({ size = 20, className = "" }: { size?: number | string; className?: string }) {
  return <span className={`en-loading-icon ${className}`} style={{ "--loading-size": typeof size === "number" ? `${size}px` : size } as CSSProperties} aria-hidden="true"><OrbitalRing/><BrandMark size={16}/></span>;
}

export function LoadingIndicator({ message = "Loading", compact = false, className = "" }: { message?: string; compact?: boolean; className?: string }) {
  return <div className={`en-loading-indicator ${compact ? "en-loading-compact" : "en-loading-panel"} ${className}`} role="status" aria-live="polite"><LoadingIcon size={compact ? 24 : 100}/><span>{message}</span>{!compact && <span className="en-loading-track" aria-hidden="true"><span/></span>}</div>;
}

export function LoadingScreen({ message = "Loading" }: { message?: string }) {
  return <div className="en-auth-transition" role="status" aria-live="polite"><div className="en-auth-transition-scene" aria-hidden="true"><OrbitalRing/><BrandMark size={62}/></div><p>{message}<span aria-hidden="true">…</span></p><div className="en-auth-transition-track" aria-hidden="true"><span/></div></div>;
}
