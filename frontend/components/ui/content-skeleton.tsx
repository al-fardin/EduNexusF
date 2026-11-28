import { LoadingIndicator } from "@/components/ui/loading-indicator";
/** Kept as a compatibility entry point for existing data-loading boundaries. */
export function ContentSkeleton({rows=3}:{rows?:number}){return <LoadingIndicator compact={rows < 2} className="en-content-skeleton"/>}
