import { create } from "zustand";
import type { ClassroomCall } from "@/services/calling";
export type CallPhase =
  | "idle"
  | "preparing"
  | "incoming"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "elsewhere"
  | "ended";
type CallState = {
  call: ClassroomCall | null;
  phase: CallPhase;
  local: MediaStream | null;
  remote: MediaStream | null;
  muted: boolean;
  speaker: boolean;
  cameraOff: boolean;
  sharing: boolean;
  minimized: boolean;
  error: string;
  audioBlocked: boolean;
};
export const useCallStore = create<CallState>(() => ({
  call: null,
  phase: "idle",
  local: null,
  remote: null,
  muted: false,
  speaker: false,
  cameraOff: false,
  sharing: false,
  minimized: false,
  error: "",
  audioBlocked: false,
}));
export interface CallControls {
  start: (thread: string, media: "audio" | "video") => Promise<void>;
  accept: () => Promise<void>;
  end: (decline?: boolean) => Promise<void>;
  mute: () => void;
  camera: () => void;
  flip: () => Promise<void>;
  share: () => Promise<void>;
}
let controls: CallControls | null = null;
export function bindCallControls(value: CallControls | null) {
  controls = value;
}
export function callControls() {
  return controls;
}
