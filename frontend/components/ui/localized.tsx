"use client";
import { usePreferences } from "@/providers/preferences-provider";
// Explicit UI labels only. Classroom content and server error text are untouched.
export function Localized({ children }: { children: string }) {
  return <>{usePreferences().t(children)}</>;
}
