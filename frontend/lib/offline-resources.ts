import { api } from "./api";
import { useAuthStore } from "@/store/auth-store";
import { cacheOffline, offlineKey, purgeOffline, readOffline, removeOffline } from "./offline-store";
export function unavailableNetwork(error: unknown) { const status = (error as {
    response?: {
        status?: number;
    };
})?.response?.status; return !status || status >= 500; }
export async function cachedResource<T>(classId: string, target: string, fetcher: () => Promise<T>): Promise<T> {
    const owner = useAuthStore.getState().user?.id;
    if (!owner)
        return fetcher();
    const key = offlineKey(owner, classId, target, "cache");
    try {
        const value = await fetcher();
        await cacheOffline({ id: key, owner, classId, target, kind: "cache", title: target, bytes: JSON.stringify(value).length * 2, value }).catch(() => { });
        return value;
    }
    catch (error) {
        const status = (error as {
            response?: {
                status?: number;
            };
        })?.response?.status;
        if (status === 403)
            await purgeOffline(owner, classId).catch(() => { });
        if (status === 404)
            await removeOffline(owner, key).catch(() => { });
        if (unavailableNetwork(error)) {
            const saved = await readOffline<T>(owner, key).catch(() => null);
            if (saved)
                return saved.value;
        }
        throw error;
    }
}
export async function materialBlob(path: string, signal?: AbortSignal, filename = "Material"): Promise<Blob> {
    const match = /^\/classrooms\/([a-f0-9-]{36})\/materials\/([a-f0-9-]{36})\/download$/i.exec(path);
    const owner = useAuthStore.getState().user?.id;
    if (!match || !owner)
        return (await api.get<Blob>(path, { responseType: "blob", signal })).data;
    const [, classId, target] = match, key = offlineKey(owner, classId, target, "material");
    try {
        const response = await api.get<Blob>(path, { responseType: "blob", signal });
        if (signal?.aborted)
            throw new DOMException("Canceled", "AbortError");
        await cacheOffline({ id: key, owner, classId, target, kind: "material", title: filename, bytes: response.data.size, value: response.data }).catch(() => { });
        return response.data;
    }
    catch (error) {
        if (signal?.aborted)
            throw error;
        const status = (error as {
            response?: {
                status?: number;
            };
        })?.response?.status;
        if (status === 403)
            await purgeOffline(owner, classId).catch(() => { });
        if (status === 404)
            await removeOffline(owner, key).catch(() => { });
        if (unavailableNetwork(error)) {
            const saved = await readOffline<Blob>(owner, key).catch(() => null);
            if (saved)
                return saved.value;
        }
        throw error;
    }
}
