"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";

export function CourseCover({ id }: { id: string }) {
  const cover = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = cover.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      element.dataset.visible = "true";
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const hash = Array.from(id).reduce(
    (value, c) => Math.imul(value ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  const gradient = useId().replace(/:/g, "");
  const style = {
    "--orbit-angle": `${(hash % 50) - 25}deg`,
    "--orbit-duration": `${22 + (hash % 15)}s`,
    "--orbit-delay": `-${hash % 20}s`,
  } as CSSProperties;

  return (
    <div ref={cover} className={`en-course-cover en-cover-${hash % 3} en-orbital-cover`} style={style} aria-hidden="true">
      <svg viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="var(--cover-a)" />
            <stop offset="1" stopColor="var(--cover-b)" />
          </linearGradient>
          <linearGradient id={`${gradient}-metal`} x1="0" x2=".8" y1="0" y2="1">
            <stop stopColor="#fff" stopOpacity=".85" />
            <stop offset=".24" stopColor="var(--cover-c)" />
            <stop offset=".53" stopColor="var(--cover-d)" />
            <stop offset=".77" stopColor="var(--cover-c)" />
            <stop offset="1" stopColor="#fff" stopOpacity=".75" />
          </linearGradient>
          <radialGradient id={`${gradient}-glow`}>
            <stop stopColor="var(--cover-c)" stopOpacity=".7" />
            <stop offset="1" stopColor="var(--cover-c)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="360" height="190" fill={`url(#${gradient})`} />
        <ellipse className="en-cover-glow" cx="255" cy="120" rx="155" ry="115" fill={`url(#${gradient}-glow)`} />
        <g className="en-cover-orbits" fill="none">
          <ellipse cx="248" cy="109" rx="150" ry="59" stroke="var(--cover-c)" strokeOpacity=".35" />
          <ellipse cx="248" cy="109" rx="122" ry="47" stroke="#fff" strokeOpacity=".25" />
          <ellipse cx="248" cy="109" rx="89" ry="68" stroke={`url(#${gradient}-metal)`} strokeWidth="23" />
          <ellipse cx="248" cy="109" rx="89" ry="68" stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
          <g className="en-cover-satellite">
            <circle cx="103" cy="109" r="5" fill="#fff" fillOpacity=".85" stroke="var(--cover-c)" strokeWidth="3" />
            <circle cx="393" cy="109" r="3" fill="var(--cover-c)" />
          </g>
        </g>
        <g fill="#fff" opacity=".55">
          {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={30 + ((hash + i * 61) % 310)} cy={25 + ((hash + i * 37) % 140)} r={i % 2 ? 1 : 1.7} />)}
        </g>
      </svg>
    </div>
  );
}
