/** Local-only bridge. This cannot attest that the client is genuine.
 * Backend pairing + heartbeat are still required for exam entry.
 */
const BRIDGE = "http://127.0.0.1:47913";
const TIMEOUT_MS = 4000;

async function localFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(BRIDGE + path, {
      ...options, mode: "cors", cache: "no-store", credentials: "omit", signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function desktopClientAvailable(): Promise<boolean> {
  try {
    const response = await localFetch("/health");
    const body = await response.json() as {ok?: boolean};
    return response.ok && body.ok === true;
  } catch {
    return false;
  }
}

export async function sendDesktopPairRequest(pairCode: string, server: string): Promise<void> {
  const response = await localFetch("/pair", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({pair_code: pairCode, server}),
  });
  const data = await response.json() as {ok?: boolean; error?: string};
  if (!response.ok || !data.ok) throw new Error(data.error || "Desktop Client rejected pairing request");
}

export function desktopApiOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_EDUNEXUS_DESKTOP_API_ORIGIN;
  if (explicit) return explicit.replace(/\/$/, "");
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://127.0.0.1:8080";
  throw new Error("Desktop API URL is not configured for this deployment. Contact your exam administrator.");
}
