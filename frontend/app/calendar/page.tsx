import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceCalendar } from "@/components/workspace/calendar";
export default function Page() {
  return (
    <AuthGuard>
      <WorkspaceCalendar />
    </AuthGuard>
  );
}
