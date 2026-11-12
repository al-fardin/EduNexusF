import { AuthGuard } from "@/components/auth/auth-guard";
import { TaskInbox } from "@/components/workspace/task-inbox";
export default function TasksPage() {
  return (
    <AuthGuard>
      <TaskInbox />
    </AuthGuard>
  );
}
