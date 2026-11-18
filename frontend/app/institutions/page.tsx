import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { InstitutionsWorkspace } from "@/components/institutions/workspace";
export default function Page() {
  return (
    <AuthGuard>
      <Suspense fallback={<ContentSkeleton rows={4} />}>
        <InstitutionsWorkspace />
      </Suspense>
    </AuthGuard>
  );
}
