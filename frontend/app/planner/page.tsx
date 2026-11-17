import { AuthGuard } from "@/components/auth/auth-guard";
import { StudentPlanner } from "@/components/workspace/planner";
export default function Page() {
  return (
    <AuthGuard>
      <StudentPlanner />
    </AuthGuard>
  );
}
