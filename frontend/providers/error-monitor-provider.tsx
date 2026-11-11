"use client";
import { useEffect } from "react";
import { reportClientError } from "@/lib/telemetry";
export function ErrorMonitorProvider() {
  useEffect(() => {
    const runtime = () => reportClientError("runtime"),
      rejection = () => reportClientError("rejection");
    window.addEventListener("error", runtime);
    window.addEventListener("unhandledrejection", rejection);
    return () => {
      window.removeEventListener("error", runtime);
      window.removeEventListener("unhandledrejection", rejection);
    };
  }, []);
  return null;
}
