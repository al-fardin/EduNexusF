import {AuthGuard} from "@/components/auth/auth-guard";
import {WorkspaceHome} from "@/components/workspace/workspace-home";
export default function Page(){return <AuthGuard><WorkspaceHome/></AuthGuard>}
