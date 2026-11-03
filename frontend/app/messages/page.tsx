import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Inbox } from "@/components/messaging/inbox";
export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading messages…</p>}>
      <AuthGuard>
        <Inbox />
      </AuthGuard>
    </Suspense>
  );
}
