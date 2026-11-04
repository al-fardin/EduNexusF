"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { push, pushDeviceID } from "@/services/push";
declare global {
  interface Window {
    EduNexusPush?: {
      status: () => string;
      enable: (token: string, user: string) => void;
      unbind: () => void;
      disable: () => void;
    };
  }
}
export function PushProvider() {
  const user = useAuthStore((s) => s.user?.id);
  const token = useAuthStore((s) => s.accessToken);
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.user?.id && previous.user.id !== state.user?.id) {
          try {
            navigator.serviceWorker?.controller?.postMessage({
              type: "bind-user",
              user: null,
            });
          } catch {}
          if (window.EduNexusPush) window.EduNexusPush.unbind();
          else {
            try {
              const key = `edunexus:push-binding:${previous.user.id}`;
              const binding = localStorage.getItem(key);
              const device = localStorage.getItem("edunexus:push-device");
              localStorage.removeItem(key);
              if (binding && device && previous.accessToken)
                void fetch(
                  `${(process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "")}/notifications/push/devices/${device}?binding=${binding}`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${previous.accessToken}`,
                    },
                    keepalive: true,
                  },
                ).catch(() => {});
            } catch {}
          }
        }
      }),
    [],
  );
  useEffect(() => {
    let stopped = false;
    async function bind() {
      try {
        const registration =
          "serviceWorker" in navigator && window.isSecureContext
            ? await navigator.serviceWorker.register("/edunexus-sw.js", {
                scope: "/",
              })
            : null;
        if (stopped) return;
        const worker =
          registration?.active ??
          registration?.waiting ??
          registration?.installing;
        worker?.postMessage({ type: "bind-user", user: user ?? null });
        if (!user || !token) return;
        if (window.EduNexusPush) {
          const bound = JSON.parse(window.EduNexusPush.status()).user;
          if (bound && bound !== user) window.EduNexusPush.unbind();
        }
        if (localStorage.getItem(`edunexus:push-enabled:${user}`) !== "true")
          return;
        if (window.EduNexusPush) {
          const native = JSON.parse(window.EduNexusPush.status());
          if (native.configured && native.permission)
            window.EduNexusPush.enable(token, user);
          return;
        }
        if (
          registration &&
          "PushManager" in window &&
          Notification.permission === "granted"
        ) {
          const existing = await registration.pushManager.getSubscription();
          if (existing && !stopped)
            await push.register(pushDeviceID(), existing.toJSON());
        }
      } catch {}
    }
    void bind();
    window.addEventListener("edunexus:native-ready", bind);
    return () => {
      stopped = true;
      window.removeEventListener("edunexus:native-ready", bind);
    };
  }, [user, token]);
  return null;
}
