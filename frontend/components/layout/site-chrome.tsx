"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Folder,
  Download,
  GraduationCap,
  House,
  Layers,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  MessagingLink,
  useUnreadMessages,
} from "@/components/layout/messaging-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/instructor/classrooms", label: "Teaching", icon: GraduationCap },
  { href: "/student/classrooms", label: "Learning", icon: BookOpen },
  { href: "/classrooms", label: "Classroom", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/files", label: "Files", icon: Folder },
  { href: "/offline", label: "Saved work", icon: Download },
];
const mobileLinks = [
  links[0],
  links[1],
  links[2],
  { href: "/settings", label: "Profile", icon: Settings },
];
const authPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const active = (path: string, href: string) =>
  href === "/" ? path === "/" : path.startsWith(href);
function Logo() {
  return (
    <>
      <svg
        className="en-violet-mark"
        width="31"
        height="32"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path d="M2 4L16 10V30L2 23Z" fill="currentColor" />
        <path d="M16 10L30 4V23L16 30Z" fill="currentColor" opacity=".72" />
        <path d="M2 4L16 10L30 4L16 1Z" fill="currentColor" opacity=".35" />
      </svg>
      <strong>EduNexus</strong>
    </>
  );
}
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadMessages().data?.unread ?? 0;
  if (authPaths.includes(path))
    return (
      <>
        <div className="en-auth-theme">
          <ThemeToggle />
        </div>
        {children}
      </>
    );
  const inClass = /^\/(instructor|student)\/classrooms\/[0-9a-f-]{36}$/i.test(
    path,
  );
  return (
    <div className={`en-app-shell${inClass ? " en-in-classroom" : ""}`}>
      <aside className="en-violet-sidebar">
        <Link href="/" className="en-violet-brand" aria-label="EduNexus home">
          <Logo />
        </Link>
        <nav aria-label="Primary navigation">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(path, item.href) ? "page" : undefined}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="en-sidebar-divider" />
          <Link
            href="/messages"
            aria-current={active(path, "/messages") ? "page" : undefined}
          >
            <MessageSquare size={22} />
            <span>Messages</span>
            {unread > 0 && (
              <b className="en-sidebar-count">{unread > 99 ? "99+" : unread}</b>
            )}
          </Link>
          <Link
            href="/settings"
            aria-current={active(path, "/settings") ? "page" : undefined}
          >
            <Settings size={22} />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="en-sidebar-bottom">
          <ThemeToggle label />
          <Link href="/settings" className="en-sidebar-account">
            <span className="en-avatar">
              {user?.first_name?.slice(0, 1) || "E"}
              {user?.last_name?.slice(0, 1) || ""}
            </span>
            <span>{user?.first_name || "Profile"}</span>
            <ChevronDown size={16} />
          </Link>
        </div>
      </aside>
      <div className="en-app-content">
        <header className="en-mobilebar">
          <Link href="/" className="en-violet-brand" aria-label="EduNexus home">
            <Logo />
          </Link>
          <div className="en-mobile-actions">
            <ThemeToggle />
            <NotificationBell />
            <MessagingLink />
          </div>
        </header>
        <div className="en-site-main">{children}</div>
      </div>
      <nav className="en-violet-bottom" aria-label="Mobile navigation">
        {mobileLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(path, item.href) ? "page" : undefined}
            >
              <Icon size={23} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="en-desktop-actions">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="en-icon-button"
            aria-label="Class actions"
          >
            <Plus size={20} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="en-action-menu">
            <DropdownMenuItem
              render={<Link href="/instructor/classrooms/create" />}
            >
              Create class
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/student/classrooms/join" />}>
              Join class
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
