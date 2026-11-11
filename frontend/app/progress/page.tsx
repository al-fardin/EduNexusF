import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceProgress } from "@/components/workspace/progress";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
export default function Page() {
  return (
    <AuthGuard>
      <Suspense fallback={<ContentSkeleton rows={4} />}>
        <WorkspaceProgress />
      </Suspense>
    </AuthGuard>
  );
}
