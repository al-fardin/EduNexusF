import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceSearch } from "@/components/workspace/search";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
export default function Page() {
  return (
    <AuthGuard>
      <Suspense fallback={<ContentSkeleton rows={4} />}>
        <WorkspaceSearch />
      </Suspense>
    </AuthGuard>
  );
}
