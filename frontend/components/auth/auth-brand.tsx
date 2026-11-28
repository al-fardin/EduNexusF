import { BrandMark, BrandWordmark } from "@/components/layout/brand-mark";
import Link from "next/link";
import {OrbitalRing} from "@/components/visual/orbital-ring";

export function AuthBrand() {
  return (
    <>
      <div className="en-auth-backdrop" aria-hidden="true"><div className="en-auth-glow"/><div className="en-auth-orbits"><i/><i/><i/></div><OrbitalRing/></div>
      <div className="en-auth-mobile-brand"><BrandMark size={44} /><BrandWordmark /></div>
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus">
        <Link href="/" className="en-auth-art-mark" aria-label="EduNexus home">
          <BrandMark size={44} />
          <BrandWordmark />
        </Link>
        <div>
          <span className="en-auth-caption">CLASSES. COURSEWORK. CONNECTED.</span>
          <h2>Your classroom.<br /><em>In focus.</em></h2>
        </div>
      </aside>
    </>
  );
}
