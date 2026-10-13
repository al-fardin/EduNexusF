"use client";
import { useEffect as useEduNavEffect } from "react";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { BookOpenText, GraduationCap, LayoutDashboard, Menu, Plus, Settings2, UserRound, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/instructor/classrooms", label: "Created classes", icon: BookOpenText },
  { href: "/student/classrooms", label: "Joined classes", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings2 },
];
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

function navIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SiteChrome({children}: {children: React.ReactNode}) {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  // EduNexus navbar V3: collapse only when away from top, regardless of direction.
  // Clicking the compact pill opens the full bar until the next scroll movement.
  useEduNavEffect(() => {
    let previousY = window.scrollY;
    const initialFrame = window.requestAnimationFrame(() => {
      if (window.scrollY > 12) setCompact(true);
    });
    const update = () => {
      const y = window.scrollY;
      const moved = Math.abs(y - previousY);
      previousY = y;
      if (y <= 12) { setCompact(false); return; }
      if (moved >= 2) setCompact(true);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  // Only show progress for actual internal navigations; stop when destination renders.
  useEduNavEffect(() => {
    const onNavigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const element = event.target;
      if (!(element instanceof Element)) return;
      const link = element.closest("a[href]");
      if (!link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const destination = new URL(href, window.location.href);
        if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) {
          setPendingPath(destination.pathname);
        }
      } catch { /* Ignore invalid links. */ }
    };
    window.addEventListener("click", onNavigate, true);
    return () => window.removeEventListener("click", onNavigate, true);
  }, []);
  // Finish the indicator after a route completes, including browser back/forward.
  useEduNavEffect(() => {
    const timer = window.setTimeout(() => setPendingPath(null), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  const navigating = pendingPath !== null && pendingPath !== pathname;
  const user = useAuthStore(s=>s.user);
  const authRoute = authPaths.some(path=>pathname === path);
  // Don't place authenticated navigation above sign-in or recovery pages.
  if (authRoute) return <>{children}</>;
  const isPreview = pathname.startsWith("/preview");
  return <>
    {navigating && <div className="en-nav-progress" role="progressbar" aria-label="Loading page" />}
    <div className={`en-top-wrap${compact ? " en-top-compact" : ""}`}>
      <header className="en-topbar">
        <Link href={isPreview ? "/preview" : "/"} className="en-logo" aria-label="EduNexus home">
          <span className="en-logo-icon"><BookOpenText size={24} strokeWidth={1.8}/></span>
          <span><strong>EduNexus<span style={{color:"#a8b89d"}}>.</span></strong><small>Learning, reimagined</small></span>
        </Link>
        <nav className="en-top-links" aria-label="Primary navigation">
          {isPreview ? <span className="en-top-link" aria-current="page">Design preview</span> : navigation.map(n=>{
            const Icon=n.icon;
            return <Link key={n.href} href={n.href} className="en-top-link" aria-current={navIsActive(pathname,n.href)?"page":undefined}>
              <Icon size={16} strokeWidth={1.8}/>{n.label}
            </Link>;
          })}
        </nav>
        <div className="en-top-actions">
          {!isPreview && <Link href="/instructor/classrooms/create" className="en-user" aria-label="Create classroom"><Plus size={17}/> <span>New class</span></Link>}
          <Link href={isPreview?"/login":"/settings"} className="en-user" title={user?.first_name ?? "Account"}>
            <UserRound size={16}/><span>{isPreview?"Sign in":user?.first_name || "Account"}</span>
          </Link>
          {!isPreview && <button type="button" className="en-mobile-toggle" aria-label={menuOpen?"Close menu":"Open menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>
            {menuOpen?<X size={23}/>:<Menu size={23}/>}</button>}
        </div>
        <button type="button" className="en-compact-toggle" aria-label="Expand full navbar" onClick={() => setCompact(false)}><Menu size={19}/></button>
      </header>
      {!isPreview && menuOpen && <nav className="en-mobile-nav" aria-label="Mobile navigation">
        {navigation.map(n=>{const Icon=n.icon;return <Link key={n.href} href={n.href} className="en-top-link" onClick={()=>setMenuOpen(false)} aria-current={navIsActive(pathname,n.href)?"page":undefined}><Icon size={18}/>{n.label}</Link>})}
        <Link href="/instructor/classrooms/create" className="en-top-link" onClick={()=>setMenuOpen(false)}><Plus size={18}/>Create a classroom</Link>
        <Link href="/student/classrooms/join" className="en-top-link" onClick={()=>setMenuOpen(false)}><GraduationCap size={18}/>Join a classroom</Link>
      </nav>}
    </div>
    <div className="en-site-main">{children}</div>
    <footer className="en-footer"><span>© {new Date().getFullYear()} EduNexus · A better place to teach and learn.</span><span>Make learning count / V01</span></footer>
  </>;
}
