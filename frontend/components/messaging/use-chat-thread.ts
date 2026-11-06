"use client";
import { sendTyping } from "@/store/realtime-store";

import { useCallStore } from "@/store/call-store";
import type { ChatMessage } from "@/services/messaging";
import { useRealtimeStore } from "@/store/realtime-store";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { messaging, type MessagePage } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import { useMessageSettings } from "@/components/messaging/message-settings";

import { clientId } from "@/lib/client-id";
import { examError } from "@/services/exams";

export function useChatThread(classId: string, thread: string) {
  const user = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const connected = useRealtimeStore((s) => s.connected);
  const draftKey = `edunexus:message-draft:${user}:${classId}:${thread}`;
  const [draft, setDraft] = useState(() => {
    try {
      return localStorage.getItem(draftKey)?.slice(0, 4000) ?? "";
    } catch {
      return "";
    }
  });
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [emojiSize, setEmojiSize] = useState(1);
  const [emojiDraft, setEmojiDraft] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voicePreview, setVoicePreview] = useState("");
  const voiceObject = useRef("");
  const callPhase = useCallStore((s) => s.phase);
  const stars = useQuery({
    queryKey: ["message-stars", user, classId, thread],
    queryFn: () => messaging.stars(classId, thread),
  });
  const pins=useQuery({queryKey:["conversation-pins",user,classId,thread],queryFn:()=>messaging.pins(classId,thread),refetchInterval:connected?false:10000});
  useEffect(
    () => () => {
      if (voiceObject.current) URL.revokeObjectURL(voiceObject.current);
    },
    [],
  );
  function clearVoice() {
    setVoiceDuration(0);
    setVoicePreview("");
    if (voiceObject.current) URL.revokeObjectURL(voiceObject.current);
    voiceObject.current = "";
  }
  const [typing, setTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (draft) localStorage.setItem(draftKey, draft);
        else localStorage.removeItem(draftKey);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, draftKey]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function receive(event: Event) {
      const e = (event as CustomEvent).detail;
      if (e.conversation_id !== thread || e.user_id === user) return;
      if (timer) clearTimeout(timer);
      setTyping(!!e.typing);
      if (e.typing) timer = setTimeout(() => setTyping(false), 4500);
    }
    window.addEventListener("edunexus:typing", receive);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("edunexus:typing", receive);
      sendTyping(classId, thread, false);
      uploadAbort.current?.abort();
    };
  }, [classId, thread, user]);
  function beginReply(message: ChatMessage) {
    setReply(message);
    resetRequest();
    requestAnimationFrame(() => textarea.current?.focus());
  }
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const settings = useMessageSettings(classId);
  const override = useQuery({
    queryKey: ["message-theme", user, classId, thread],
    queryFn: () => messaging.theme(classId, thread),
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const canSend = settings.data?.can_send ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedSend,setFailedSend]=useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const request = useRef<string | null>(null);
  function resetRequest() {
    request.current = null;
    setFailedSend(false);
  }
  const viewport = useRef<HTMLDivElement>(null);
  const read = useRef("");
  const openingCursor=useRef<string|null>(null);
  const key = ["messages", user, classId, thread];
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const page=await messaging.history(classId,thread,pageParam);
      openingCursor.current??=page.last_read??"0";
      return {...page,opening_last_read:openingCursor.current};
    },
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.has_more ? last.messages[0]?.id : undefined,
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return [...(query.data?.pages ?? [])]
      .reverse()
      .flatMap((p) => p.messages)
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
  }, [query.data?.pages]);
  const last = messages[messages.length - 1];
  const openingRead=query.data?.pages[0]?.opening_last_read??"0";
  const firstUnread=messages.find(m=>m.sender_id!==user&&BigInt(m.id)>BigInt(openingRead))?.id;
  useEffect(() => {
    if (last && atBottom) {
      const box = viewport.current;
      if (box) box.scrollTop = box.scrollHeight;
    }
  }, [last, atBottom]);
  useEffect(() => {
    function mark() {
      if (
        !last ||
        !atBottom ||
        document.visibilityState !== "visible" ||
        read.current === last.id
      )
        return;
      read.current = last.id;
      void messaging
        .read(classId, thread, last.id)
        .then(() =>
          Promise.all([
            client.invalidateQueries({ queryKey: ["message-unread", user] }),
            client.invalidateQueries({ queryKey: ["message-classes", user] }),
            client.invalidateQueries({
              queryKey: ["conversations", user, classId],
            }),
          ]),
        )
        .catch(() => {
          read.current = "";
        });
    }
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [last, atBottom, classId, thread, client, user]);
  async function loadEarlier() {
    const box = viewport.current;
    const previousHeight = box?.scrollHeight ?? 0;
    const previousTop = box?.scrollTop ?? 0;
    setAtBottom(false);
    await query.fetchNextPage();
    requestAnimationFrame(() => {
      if (box) box.scrollTop = previousTop + box.scrollHeight - previousHeight;
    });
  }
  async function send(override?: { body: string; size: number }) {
    const body = override?.body ?? draft.trim();
    const selectedFile = override ? null : file;
    const kind =
      override || emojiDraft ? "emoji" : voiceDuration ? "voice" : "text";
    const size = override?.size ?? emojiSize;
    if (busy || (!body && !selectedFile) || !canSend) return;
    if (override) {
      setDraft(body);
      setEmojiSize(size);
      setEmojiDraft(true);
    }
    setBusy(true);
    setFailedSend(false);
    setError("");
    uploadAbort.current = new AbortController();
    setUploadProgress(0);
    request.current ??= clientId();
    try {
      const sent = await messaging.send(
        classId,
        thread,
        body,
        request.current,
        selectedFile,
        reply?.id ?? "",
        {
          signal: uploadAbort.current.signal,
          message: {
            kind,
            emoji_size: kind === "emoji" ? size : 1,
            duration_ms: kind === "voice" ? voiceDuration : 0,
          },
          onUploadProgress: (e) =>
            setUploadProgress(
              Math.min(
                100,
                Math.round((e.loaded / (e.total || file?.size || 1)) * 100),
              ),
            ),
        },
      );
      client.setQueryData<InfiniteData<MessagePage, string>>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p, i) =>
                i === 0
                  ? {
                      ...p,
                      messages: p.messages.some((m) => m.id === sent.id)
                        ? p.messages
                        : [...p.messages, sent],
                    }
                  : p,
              ),
            }
          : old,
      );
      setDraft("");
      setEmojiDraft(false);
      setEmojiSize(1);
      clearVoice();
      setReply(null);
      sendTyping(classId, thread, false);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      resetRequest();
      setAtBottom(true);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({
        queryKey: ["conversations", user, classId],
      });
    } catch (e) {
      setFailedSend(true);
      setError(
        uploadAbort.current?.signal.aborted
          ? "Upload canceled. Your draft is ready to retry."
          : examError(e),
      );
    } finally {
      setBusy(false);
      uploadAbort.current = null;
    }
  }
  function removeAttachment() {
    setFile(null);
    clearVoice();
    resetRequest();
    if (fileInput.current) fileInput.current.value = "";
  }
  function prepareVoice(recording: File, duration: number) {
    setFile(recording);
    setVoiceDuration(duration);
    setDraft("");
    setEmojiDraft(false);
    setEmojiSize(1);
    if (voiceObject.current) URL.revokeObjectURL(voiceObject.current);
    voiceObject.current = URL.createObjectURL(recording);
    setVoicePreview(voiceObject.current);
    resetRequest();
  }
  return {
    pins,
    firstUnread,
    failedSend,
    removeAttachment,
    prepareVoice,
    user,
    draft,
    setDraft,
    reply,
    setReply,
    setEmojiSize,
    setEmojiDraft,
    voiceDuration,
    voicePreview,
    callPhase,
    stars,
    clearVoice,
    typing,
    uploadProgress,
    uploadAbort,
    beginReply,
    file,
    setFile,
    fileInput,
    textarea,
    settings,
    override,
    canSend,
    busy,
    error,
    setError,
    atBottom,
    setAtBottom,
    resetRequest,
    viewport,
    query,
    messages,
    last,
    loadEarlier,
    send,
  };
}
