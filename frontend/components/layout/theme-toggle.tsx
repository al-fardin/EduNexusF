"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function ThemeToggle({ label = false }: { label?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      className={label ? "en-theme-control" : "en-icon-button"}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}{" "}
      {label && (
        <>
          <span>Dark mode</span>
          <span className="en-toggle-track" data-on={dark}>
            <i />
          </span>
        </>
      )}
    </button>
  );
}
