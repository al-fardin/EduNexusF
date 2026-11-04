import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
export type PushStatus = {
  web_configured: boolean;
  android_configured: boolean;
  public_key: string;
  devices: {
    id: string;
    platform: "web" | "android";
    enabled: boolean;
    last_seen_at: string;
  }[];
};
export const push = {
  async status(): Promise<PushStatus> {
    return (await api.get("/notifications/push")).data.data;
  },
  async register(id: string, subscription: PushSubscriptionJSON) {
    await api.put(`/notifications/push/devices/${id}`, {
      platform: "web",
      subscription,
      binding_id: pushBindingID(),
    });
  },
  async remove(id: string) {
    await api.delete(`/notifications/push/devices/${id}`, {
      params: { binding: pushBindingID() },
    });
  },
};
export function pushDeviceID() {
  let value = localStorage.getItem("edunexus:push-device");
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem("edunexus:push-device", value);
  }
  return value;
}

export function pushBindingID() {
  const user = useAuthStore.getState().user?.id;
  if (!user) throw Error("Sign in to manage notifications.");
  const key = `edunexus:push-binding:${user}`;
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}
