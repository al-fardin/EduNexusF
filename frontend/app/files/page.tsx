import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceFiles } from "@/components/workspace/files";
export default function Page() {
  return (
    <AuthGuard>
      <WorkspaceFiles />
    </AuthGuard>
  );
}
