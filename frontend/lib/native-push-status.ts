export type NativePushStatus = {
  configured: boolean;
  permission: boolean;
  enabled: boolean;
  user?: string;
};

/** Older or partially initialized app bridges must not crash the settings page. */
export function parseNativePushStatus(raw: unknown): NativePushStatus | null {
  if (typeof raw !== "string") return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (
      typeof data.configured !== "boolean" ||
      typeof data.permission !== "boolean" ||
      typeof data.enabled !== "boolean"
    ) return null;
    if (data.user !== undefined && data.user !== null && typeof data.user !== "string") {
      return null;
    }
    return {
      configured: data.configured,
      permission: data.permission,
      enabled: data.enabled,
      user: typeof data.user === "string" ? data.user : undefined,
    };
  } catch {
    return null;
  }
}
