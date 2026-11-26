import Image from "next/image";

export function BrandMark({ size = 42, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`en-brand-mark ${className}`} style={{ width: size, height: size }}>
      <Image src="/edunexus-mark.png" alt="" width={size} height={size} unoptimized />
    </span>
  );
}

export function BrandWordmark() {
  return <strong>Edu<span className="en-brand-accent">Nexus</span></strong>;
}
