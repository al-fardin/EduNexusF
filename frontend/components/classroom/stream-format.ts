import type { StreamPost } from "@/services/stream";
export function getAuthorName(post: StreamPost): string {
    const firstName = post.author?.first_name?.trim() ??
        "";
    const lastName = post.author?.last_name?.trim() ??
        "";
    const fullName = `${firstName} ${lastName}`.trim();
    return (fullName ||
        post.author?.username ||
        post.author?.email ||
        "EduNexus");
}
export function getInitials(name: string): string {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
    return initials || "EN";
}
export function formatPostDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}
