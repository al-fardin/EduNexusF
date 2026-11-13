const roots = new Set([
  "/",
  "/messages",
  "/notifications",
  "/invitations",
  "/tasks",
  "/settings",
  "/progress",
  "/calendar",
  "/semesters",
  "/files",
  "/offline",
  "/storage",
  "/search",
  "/classrooms",
  "/instructor/classrooms",
  "/student/classrooms",
]);
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    value.length > 2000 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid") return "/";
    if (
      !roots.has(url.pathname) &&
      !/^\/(instructor|student)\/classrooms\/[a-f0-9-]{36}$/i.test(url.pathname)
    )
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
