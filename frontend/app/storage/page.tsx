import { AuthGuard } from "@/components/auth/auth-guard";
import { StorageWorkspace } from "@/components/workspace/storage";
export default function StoragePage() {
  return (
    <AuthGuard>
      <StorageWorkspace />
    </AuthGuard>
  );
}
