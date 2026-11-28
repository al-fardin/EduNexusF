import { LoadingIcon } from "@/components/ui/loading-indicator";
import { cn } from "@/lib/utils"


function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("flex items-center justify-center rounded-md", className)}
      {...props}
    ><LoadingIcon size={24}/></div>
  )
}

export { Skeleton }
