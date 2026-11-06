"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
export function NetworkFeedback() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const client = useQueryClient();
  const [reachable, setReachable] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (event: Event) => {
      const writes =
        (event as CustomEvent<{ writes: number }>).detail?.writes ?? 0;
      if (writes > 0) {
        timer ??= setTimeout(() => {
          timer = undefined;
          setVisible(true);
        }, 350);
      } else {
        if (timer) clearTimeout(timer);
        timer = undefined;
        setVisible(false);
      }
    };
    const connection = (event: Event) =>
      setReachable(
        (event as CustomEvent<{ reachable: boolean }>).detail.reachable,
      );
    window.addEventListener("edunexus:api-status", update);
    window.addEventListener("edunexus:connection", connection);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("edunexus:api-status", update);
      window.removeEventListener("edunexus:connection", connection);
    };
  }, []);
  return (
    <>
      {visible && (
        <div className="en-save-progress" role="status" aria-label="Saving">
          <span />
          <span className="sr-only">Saving…</span>
        </div>
      )}
      {(!online || !reachable) && (
        <div className="en-network-banner" role="status">
          <WifiOff size={18} />
          <span>
            {!online
              ? "You’re offline. Check your connection."
              : "Unable to reach EduNexus."}
          </span>
          <a href="/offline" className="underline underline-offset-2">Saved work</a>
          <button
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              window.dispatchEvent(new Event("online"));
              try {
                await client.invalidateQueries();
              } finally {
                setRetrying(false);
              }
            }}
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
    </>
  );
}
