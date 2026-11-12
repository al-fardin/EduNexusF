import { AuthGuard } from "@/components/auth/auth-guard";
import { SemesterWorkspace } from "@/components/workspace/semesters";
export default function Page() {
  return (
    <AuthGuard>
      <SemesterWorkspace />
    </AuthGuard>
  );
}
