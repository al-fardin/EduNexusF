import { AuthGuard } from "@/components/auth/auth-guard";
import { WorkspaceTrash } from "@/components/workspace/trash";
export default function Page() {
  return (
    <AuthGuard>
      <WorkspaceTrash />
    </AuthGuard>
  );
}
