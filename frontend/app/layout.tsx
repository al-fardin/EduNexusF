import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import "./workspace.css";
import "./violet.css";
import { AppThemeProvider } from "@/providers/theme-provider";
import { PushProvider } from "@/providers/push-provider";
import { AppUpdateProvider } from "@/providers/app-update-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SiteChrome } from "@/components/layout/site-chrome";
import { NetworkFeedback } from "@/components/ui/network-feedback";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "EduNexus", statusBarStyle: "default" },
  title: "EduNexus",
  description: "Classes, exams and coursework.",
  icons: { icon: "/edunexus-mark.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <AppThemeProvider>
          <QueryProvider>
            <RealtimeProvider />
            <PushProvider />
            <AppUpdateProvider />
            <SiteChrome>{children}</SiteChrome>
            <NetworkFeedback />
          </QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
