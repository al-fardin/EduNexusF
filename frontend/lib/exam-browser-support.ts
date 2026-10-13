// UI support detection only. Extension STATUS + server consent are separate gates.
export type SupportedExamBrowser = "chrome" | "edge";
export type ExamBrowser = SupportedExamBrowser | "unsupported";

export function detectExamBrowser(userAgent: string): ExamBrowser {
  // Desktop-only. Chromium browsers on Android/iOS cannot load this unpacked extension.
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)) return "unsupported";
  if (/Edg\//.test(userAgent)) return "edge";
  if (/Chrome\//.test(userAgent) && !/OPR\/|Opera|Vivaldi|SamsungBrowser|Edg\//i.test(userAgent)) return "chrome";
  return "unsupported";
}

export const extensionAddress = (browser: SupportedExamBrowser) =>
  browser === "edge" ? "edge://extensions" : "chrome://extensions";
