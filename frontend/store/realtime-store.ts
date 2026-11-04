import { create } from "zustand";
export const useRealtimeStore = create<{
  connected: boolean;
  setConnected: (connected: boolean) => void;
}>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
let socket: WebSocket | null = null;
export function setRealtimeSocket(value: WebSocket | null) {
  socket = value;
}
let lastTyping = 0;
export function sendTyping(
  classroom_id: string,
  conversation_id: string,
  typing: boolean,
) {
  if (socket?.readyState !== WebSocket.OPEN) return;
  const now = Date.now();
  if (typing && now - lastTyping < 1000) return;
  lastTyping = now;
  socket.send(
    JSON.stringify({ kind: "typing", classroom_id, conversation_id, typing }),
  );
}
