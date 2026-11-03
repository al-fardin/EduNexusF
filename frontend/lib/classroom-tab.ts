"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useClassroomTab<T extends string>(allowed: readonly T[], fallback: T) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const requested = search.get("tab") as T | null;
  const activeTab = requested && allowed.includes(requested) ? requested : fallback;
  function setActiveTab(tab: T) {
    const params = new URLSearchParams(search.toString());
    params.set("tab", tab);
    params.delete("compose");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }
  return [activeTab, setActiveTab] as const;
}
