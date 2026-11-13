import { AuthGuard } from "@/components/auth/auth-guard";
import { EnrollmentInbox } from "@/components/workspace/enrollment-inbox";
export default function InvitationsPage() {
  return (
    <AuthGuard>
      <EnrollmentInbox />
    </AuthGuard>
  );
}
