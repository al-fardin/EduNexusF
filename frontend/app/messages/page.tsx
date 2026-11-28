import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Inbox } from "@/components/messaging/inbox";
export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingIndicator message="Loading messages"/>}>
      <AuthGuard>
        <Inbox />
      </AuthGuard>
    </Suspense>
  );
}
