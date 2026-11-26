import Image from "next/image";

export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return <Image src="/edunexus-mark.svg" alt="" width={size} height={size} className={className} unoptimized />;
}

export function BrandWordmark() {
  return <strong>Edu<span className="en-brand-accent">Nexus</span></strong>;
}
