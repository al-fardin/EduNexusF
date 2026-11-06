"use client";
import { ProtectedFilePreview } from "@/components/files/protected-preview";
import { useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { messaging, type ChatMessage } from "@/services/messaging";
import { examError } from "@/services/exams";
import { VoiceMessage } from "./voice-message";
export function MessageFile({
  classId,
  thread,
  message,
}: {
  classId: string;
  thread: string;
  message: ChatMessage;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = message.attachment;
  if (!file) return null;
  if (message.kind === "voice")
    return (
      <VoiceMessage
        path={`/classrooms/${classId}/conversations/${thread}/messages/${message.id}/file`}
        duration={message.duration_ms}
        type={file.type}
      />
    );
  return (
    <>
      <button
        type="button"
        className="en-message-file"
        disabled={busy}
        aria-label={`Download ${file.name}`}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await messaging.download(classId, thread, message.id, file.name);
          } catch (e) {
            setError(examError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <FileText size={23} />
        <span>
          <strong>{file.name}</strong>
          <small>
            {file.size >= 1048576
              ? `${(file.size / 1048576).toFixed(1)} MB`
              : `${Math.max(1, Math.round(file.size / 1024))} KB`}
          </small>
        </span>
        {busy ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
      </button>
      <ProtectedFilePreview
        path={`/classrooms/${classId}/conversations/${thread}/messages/${message.id}/file`}
        filename={file.name}
      />
      {error && (
        <p role="alert" className="en-chat-error">
          {error}
        </p>
      )}
    </>
  );
}
