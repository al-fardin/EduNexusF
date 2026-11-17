import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PersonalWorkspace } from "@/components/workspace/personal-workspace";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
export default function Page() {
  return (
    <AuthGuard>
      <Suspense fallback={<ContentSkeleton rows={4} />}>
        <PersonalWorkspace />
      </Suspense>
    </AuthGuard>
  );
}
