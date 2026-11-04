"use client";
import { useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, LoaderCircle } from "lucide-react";
import { push, pushDeviceID } from "@/services/push";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
function applicationKey(value: string) {
  const raw = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function PushSettings() {
  const user = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["push-settings", user],
    queryFn: push.status,
    enabled: !!user,
  });
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const rawNative = useSyncExternalStore(
    subscribeNative,
    nativeSnapshot,
    () => "null",
  );
  const native: {
    configured: boolean;
    permission: boolean;
    enabled: boolean;
    user?: string;
  } | null = JSON.parse(rawNative);
  const [device] = useState(() => {
    try {
      return pushDeviceID();
    } catch {
      return "";
    }
  });
  const enabled = native
    ? native.enabled && native.user === user
    : (query.data?.devices.some((d) => d.id === device && d.enabled) ?? false);
  const configured = native
    ? native.configured && query.data?.android_configured
    : query.data?.web_configured;
  async function toggle() {
    if (!user) return;
    setBusy(true);
    setNotice("");
    try {
      if (enabled) {
        localStorage.removeItem(`edunexus:push-enabled:${user}`);
        if (window.EduNexusPush) {
          window.EduNexusPush.disable();
        } else {
          await push.remove(pushDeviceID());
          localStorage.removeItem(`edunexus:push-binding:${user}`);
          const registration = await navigator.serviceWorker.getRegistration();
          await (
            await registration?.pushManager.getSubscription()
          )?.unsubscribe();
        }
        setNotice("Notifications disabled on this device.");
      } else {
        if (!configured)
          throw Error("Notifications are not available on this device yet.");
        if (window.EduNexusPush) {
          const token = useAuthStore.getState().accessToken;
          if (!token) throw Error("Sign in again to enable notifications.");
          localStorage.setItem(`edunexus:push-enabled:${user}`, "true");
          window.EduNexusPush.enable(token, user);
          setNotice("Confirm notification permission on your phone.");
        } else {
          if (
            !window.isSecureContext ||
            !("serviceWorker" in navigator) ||
            !("PushManager" in window)
          )
            throw Error(
              "Open the HTTPS app in a browser that supports notifications.",
            );
          const permission = await Notification.requestPermission();
          if (permission !== "granted")
            throw Error(
              "Allow notifications in your browser settings to enable updates.",
            );
          const registration = await navigator.serviceWorker.register(
            "/edunexus-sw.js",
            { scope: "/" },
          );
          await navigator.serviceWorker.ready;
          const subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationKey(query.data!.public_key),
            }));
          registration.active?.postMessage({ type: "bind-user", user });
          await push.register(pushDeviceID(), subscription.toJSON());
          localStorage.setItem(`edunexus:push-enabled:${user}`, "true");
          setNotice("Notifications enabled on this device.");
        }
      }
      await client.invalidateQueries({ queryKey: ["push-settings", user] });
    } catch (e) {
      setNotice(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="en-push-settings">
      <div>
        <BellRing size={20} />
        <div>
          <h3>Device notifications</h3>
          <p>Messages, exams, coursework and reminders.</p>
        </div>
      </div>
      <button
        className="en-outline-button"
        disabled={busy || query.isPending || (!enabled && !configured)}
        onClick={() => void toggle()}
      >
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
        {enabled
          ? "Disable on this device"
          : configured
            ? "Enable notifications"
            : "Not available yet"}
      </button>
      {(notice || query.isError) && (
        <p role="status">{notice || examError(query.error)}</p>
      )}
    </section>
  );
}

function nativeSnapshot() {
  try {
    return window.EduNexusPush?.status() ?? "null";
  } catch {
    return "null";
  }
}
function subscribeNative(callback: () => void) {
  window.addEventListener("edunexus:native-ready", callback);
  window.addEventListener("edunexus:push-status", callback);
  return () => {
    window.removeEventListener("edunexus:native-ready", callback);
    window.removeEventListener("edunexus:push-status", callback);
  };
}
