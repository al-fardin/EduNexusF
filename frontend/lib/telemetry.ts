const sent = new Map<string, number>();
// Only fixed categories leave the device. No errors, stacks, URLs or user data.
export function reportClientError(
  category: "runtime" | "rejection" | "boundary",
) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const now = Date.now();
  if (now - (sent.get(category) ?? 0) < 60000) return;
  let token;
  try {
    token = localStorage.getItem("access_token");
  } catch {
    return;
  }
  if (!token) return;
  sent.set(category, now);
  void fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category }),
    keepalive: true,
  }).catch(() => {});
}
