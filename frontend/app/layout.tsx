import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { SiteChrome } from "@/components/layout/site-chrome";
import { NetworkFeedback } from "@/components/ui/network-feedback";

export const metadata: Metadata = {
  title: "EduNexus | Learning, reimagined",
  description: "Your classroom companion: create classes, join learning spaces, share announcements, and stay organised.",
  icons: {icon:"/edunexus-mark.svg"},
};

export default function RootLayout({children}:{children: React.ReactNode}) {
  return <html lang="en" className="h-full antialiased">
    <body className="flex min-h-full flex-col">
      <QueryProvider><SiteChrome>{children}</SiteChrome><NetworkFeedback /></QueryProvider>
    </body>
  </html>;
}
