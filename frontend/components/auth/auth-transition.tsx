import { LoadingScreen } from "@/components/ui/loading-indicator";
export function AuthTransition({message}:{message:string}){
  return <LoadingScreen message={message}/>;
}
