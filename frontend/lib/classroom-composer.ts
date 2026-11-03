"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function useClassroomComposer() {
  const pathname=usePathname();const search=useSearchParams();const router=useRouter();
  const mode=search.get("compose");
  function change(mode:"announcement"|"material"|null){const next=new URLSearchParams(search.toString());if(mode)next.set("compose",mode);else next.delete("compose");const url=`${pathname}?${next.toString()}`;if(mode)router.push(url,{scroll:false});else router.replace(url,{scroll:false})}
  return [mode,change] as const;
}
