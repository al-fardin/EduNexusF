"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { setRealtimeSocket, useRealtimeStore } from "@/store/realtime-store";
const roots = [
  "conversation-pins",
  "conversation-preferences",
  "messages",
  "message-unread",
  "message-classes",
  "conversations",
  "message-theme",
  "messaging-settings",
  "notifications",
  "message-stars",
  "starred-messages",
];
export function RealtimeProvider() {
  const user = useAuthStore((s) => s.user?.id);
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  useEffect(() => {
    if (!user || !token) return;
    let stopped = false;
    let ws: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let connecting = false;
    const invalidate = () => {
      for (const root of roots)
        void client.invalidateQueries({ queryKey: [root] });
    };
    async function connect() {
      if (stopped || connecting || ws?.readyState === WebSocket.OPEN) return;
      connecting = true;
      try {
        const { data } = await api.post("/messaging/realtime-ticket");
        if (stopped) return;
        const hint =
          data.data.socket_url ||
          process.env.NEXT_PUBLIC_REALTIME_URL ||
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname}:8080/messaging/socket`;
        const url = new URL(hint, location.href);
        if (!["ws:", "wss:"].includes(url.protocol))
          throw Error("Invalid realtime address");
        url.searchParams.set("ticket", data.data.ticket);
        ws = new WebSocket(url);
        setRealtimeSocket(ws);
        ws.onopen = () => {
          failures = 0;
          useRealtimeStore.getState().setConnected(true);
          invalidate();
        };
        ws.onmessage = (event) => {
          try {
            const e = JSON.parse(event.data);
            if(e.kind==="call"){window.dispatchEvent(new CustomEvent("edunexus:call",{detail:e}));return}
            if (e.kind === "typing") {
              window.dispatchEvent(
                new CustomEvent("edunexus:typing", { detail: e }),
              );
              return;
            }
            if (e.kind !== "connected") invalidate();
          } catch {}
        };
        ws.onerror = () => ws?.close();
        ws.onclose = () => {
          useRealtimeStore.getState().setConnected(false);
          setRealtimeSocket(null);
          retry();
        };
      } catch {
        retry();
      } finally {
        connecting = false;
      }
    }
    function retry() {
      if (stopped || timer) return;
      timer = setTimeout(
        () => {
          timer = undefined;
          void connect();
        },
        Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)) +
          Math.random() * 500,
      );
    }
    function online() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      void connect();
    }
    void connect();
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      window.removeEventListener("online", online);
      if (timer) clearTimeout(timer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      setRealtimeSocket(null);
      useRealtimeStore.getState().setConnected(false);
    };
  }, [user, token, client]);
  return null;
}
