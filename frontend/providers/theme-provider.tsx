"use client";
import { ThemeProvider } from "next-themes";
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="edunexus-theme"
    >
      {children}
    </ThemeProvider>
  );
}
