"use client";
import type { StreamPost } from "@/services/stream";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getAuthorName, formatPostDate } from "./stream-format";
export function AnnouncementDetailsModal({ post, onClose }: {
    post: StreamPost;
    onClose: () => void;
}) {
    return <Dialog open onOpenChange={open => { if (!open)
        onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{post.title?.trim() || "Announcement"}</DialogTitle><DialogDescription>{getAuthorName(post)}  ·  {formatPostDate(post.created_at)}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>{post.updated_at !== post.created_at && <p className="text-xs text-muted-foreground">Updated {formatPostDate(post.updated_at)}</p>}</DialogContent></Dialog>;
}
