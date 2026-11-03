"use client";
import { useId } from "react";
import type { ChatTheme } from "@/services/messaging";
const palettes: Record<ChatTheme, string[]> = {
  violet: ["#a978e4", "#ce9cec", "#8e70da", "#f3bd7b"],
  lavender: ["#bda1f0", "#dcb9f8", "#99bdf3", "#f6ca85"],
  ocean: ["#71b4df", "#78cecd", "#9cbcef", "#f5cc8d"],
  sage: ["#95b99b", "#b6cc8e", "#77b7a3", "#e3bd87"],
  rose: ["#dd9ab7", "#ecb2c5", "#b995d6", "#f2c587"],
  midnight: ["#8d9bdd", "#b897e1", "#74b3d7", "#e1bf7b"],
};
export function ChatWallpaper({ theme }: { theme: ChatTheme }) {
  const id = useId().replaceAll(":", "");
  const [a, b, c, d] = palettes[theme];
  return (
    <svg
      className={`en-chat-wallpaper en-wallpaper-${theme}`}
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-glow`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <pattern
          id={`${id}-doodles`}
          width="180"
          height="185"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 30L48 18L36 48L31 34Z M31 34L48 18" stroke={a} />
            <path
              d="M100 39L105 27L110 39L123 44L110 49L105 61L100 49L87 44Z"
              stroke={d}
            />
            <circle cx="148" cy="113" r="9" stroke={c} />
            <path
              d="M24 113Q37 101 50 113V138Q37 126 24 138Z M50 113Q63 101 76 113V138Q63 126 50 138 M50 113V138"
              stroke={b}
            />
            <path
              d="M108 156C94 146 92 137 100 134C105 132 108 135 108 138C111 132 117 132 121 136C127 143 116 152 108 156Z"
              stroke={a}
            />
            <circle cx="77" cy="82" r="2" fill={d} stroke="none" />
            <circle cx="154" cy="12" r="2.5" fill={b} stroke="none" />
          </g>
        </pattern>
      </defs>
      {theme === "ocean" ? (
        <g className="en-wallpaper-shapes">
          <path d="M0 645Q120 570 250 650T600 615V800H0Z" fill={a} />
          <path d="M0 720Q160 630 320 708T600 690V800H0Z" fill={b} />
          <circle cx="506" cy="84" r="55" fill={d} />
          <path d="M65 171Q120 110 180 169Q120 151 65 171Z" fill={c} />
        </g>
      ) : theme === "sage" ? (
        <g className="en-wallpaper-shapes">
          <path
            d="M-40 800Q120 580 15 350Q180 435 110 610Q260 538 210 748Z"
            fill={a}
          />
          <path d="M600 0Q430 160 545 350Q390 235 470 100Z" fill={b} />
          <ellipse
            cx="500"
            cy="710"
            rx="105"
            ry="45"
            transform="rotate(-30 500 710)"
            fill={c}
          />
        </g>
      ) : theme === "rose" ? (
        <g className="en-wallpaper-shapes">
          <path d="M0 200C140 120 120 10 260 0H0Z" fill={b} />
          <path d="M600 800V550C470 600 530 730 370 800Z" fill={a} />
          <g transform="translate(470 115)">
            <circle cx="-28" r="34" fill={a} />
            <circle cx="28" r="34" fill={b} />
            <circle cy="-28" r="34" fill={c} />
            <circle cy="28" r="34" fill={d} />
            <circle r="20" fill={d} />
          </g>
        </g>
      ) : theme === "midnight" ? (
        <g className="en-wallpaper-shapes">
          <circle cx="495" cy="95" r="58" fill={c} />
          <ellipse
            cx="495"
            cy="95"
            rx="95"
            ry="18"
            transform="rotate(-25 495 95)"
            fill="none"
            stroke={a}
            strokeWidth="13"
          />
          <circle cx="20" cy="780" r="132" fill={a} />
          <path
            d="M50 70L100 115L165 85L190 150"
            fill="none"
            stroke={d}
            strokeWidth="2"
          />
          <circle cx="50" cy="70" r="5" fill={d} />
          <circle cx="100" cy="115" r="5" fill={d} />
          <circle cx="165" cy="85" r="5" fill={d} />
          <circle cx="190" cy="150" r="5" fill={d} />
        </g>
      ) : theme === "lavender" ? (
        <g className="en-wallpaper-shapes">
          <circle cx="510" cy="75" r="62" fill={d} />
          <path
            d="M0 170Q5 120 50 128Q55 60 115 80Q150 50 175 105Q230 95 240 160Z"
            fill={a}
          />
          <path
            d="M350 800Q340 735 400 735Q410 680 470 710Q530 660 555 740Q595 725 600 760V800Z"
            fill={c}
          />
        </g>
      ) : (
        <g className="en-wallpaper-shapes">
          <path d="M0 0H260L0 250Z" fill={`url(#${id}-glow)`} />
          <path d="M600 800H340L600 540Z" fill={a} />
          <path d="M600 555V800H380Z" fill={b} />
          <circle cx="505" cy="90" r="50" fill={d} />
          <path d="M50 675L115 630L170 685L105 730Z" fill={c} />
        </g>
      )}
      <rect
        width="600"
        height="800"
        fill={`url(#${id}-doodles)`}
        className="en-wallpaper-doodles"
      />
    </svg>
  );
}
