"use client";
import { useRealtimeStore } from "@/store/realtime-store";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { messaging } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
export function useUnreadMessages() {
  const connected = useRealtimeStore((s) => s.connected);
  const user = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["message-unread", user],
    queryFn: messaging.unread,
    enabled: !!user,
    refetchInterval: connected ? false : 10000,
    refetchIntervalInBackground: false,
  });
}
export function MessagingLink({ classroomId }: { classroomId?: string }) {
  const query = useUnreadMessages();
  const unread = query.data?.unread ?? 0;
  return (
    <Link
      className="en-icon-button en-message-icon"
      href={classroomId ? `/messages?class=${classroomId}` : "/messages"}
      aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
    >
      <MessageSquare size={21} />
      {unread > 0 && (
        <span className="en-unread-dot">{unread > 99 ? "99+" : unread}</span>
      )}
    </Link>
  );
}
