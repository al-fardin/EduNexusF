import {OrbitalRing} from "@/components/visual/orbital-ring";
import {BrandMark} from "@/components/layout/brand-mark";
export function AuthTransition({message}:{message:string}){
  return <div className="en-auth-transition" role="status" aria-live="polite"><div className="en-auth-transition-scene" aria-hidden="true"><OrbitalRing/><BrandMark size={62}/></div><p>{message}<span aria-hidden="true">…</span></p><div className="en-auth-transition-track" aria-hidden="true"><span/></div></div>;
}
