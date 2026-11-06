import type { AuthUser } from "@/store/auth-store";
const prefix = "edunexus:verified-offline:";
export function rememberOfflineSession(user: AuthUser, token: string | null) { try {
    if (!token || localStorage.getItem("access_token") !== token)
        return;
    localStorage.setItem(prefix + user.id, JSON.stringify({ user, verifiedAt: Date.now() }));
}
catch { /* Storage can be unavailable in private browsing. */ } }
export function offlineSession(token: string | null): AuthUser | null { try {
    if (!token)
        return null;
    const payload = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now())
        return null;
    const owner = payload.user_id ?? payload.sub;
    if (typeof owner !== "string")
        return null;
    const saved = JSON.parse(localStorage.getItem(prefix + owner) ?? "null");
    if (saved?.user?.id !== owner || saved.user.status !== "active" || typeof saved.verifiedAt !== "number" || Date.now() - saved.verifiedAt > 86400000 || saved.verifiedAt > Date.now() + 60000)
        return null;
    return saved.user;
}
catch {
    return null;
} }
export function clearOfflineSession(owner: string) { try {
    localStorage.removeItem(prefix + owner);
}
catch { } }
