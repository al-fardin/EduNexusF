"use client";
import { useRealtimeStore } from "@/store/realtime-store";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Palette, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { messaging, type ChatTheme } from "@/services/messaging";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";

export const chatThemes: { id: ChatTheme; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "#b499f7" },
  { id: "lavender", label: "Lavender mist", color: "#d0bcf4" },
  { id: "ocean", label: "Ocean", color: "#77b6d5" },
  { id: "sage", label: "Sage", color: "#a4bca2" },
  { id: "rose", label: "Rose", color: "#d7a0b5" },
  { id: "midnight", label: "Midnight", color: "#576787" },
];
export function useMessageSettings(classId: string) {
  const connected = useRealtimeStore((s) => s.connected);
  const user = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["messaging-settings", user, classId],
    queryFn: () => messaging.settings(classId),
    enabled: !!classId,
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
}
export function MessageSettings({
  classId,
  thread,
  peerId,
}: {
  classId: string;
  thread?: string;
  peerId?: string;
}) {
  const connected = useRealtimeStore((s) => s.connected);
  const user = useAuthStore((s) => s.user?.id);
  const query = useMessageSettings(classId);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const override = useQuery({
    queryKey: ["message-theme", user, classId, thread],
    queryFn: () => messaging.theme(classId, thread!),
    enabled: !!thread,
    refetchInterval: connected ? false : 5000,
    refetchIntervalInBackground: false,
  });
  const selected = thread ? override.data?.theme : query.data?.theme;
  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["messaging-settings", user, classId],
        }),
        client.invalidateQueries({
          queryKey: ["message-theme", user, classId],
        }),
      ]);
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  const students = (query.data?.students ?? []).filter(
    (s) =>
      (!peerId || s.id === peerId) &&
      `${s.name} ${s.roll}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        className="en-icon-button"
        aria-label={
          thread ? "Conversation settings" : "Class messaging settings"
        }
        onClick={() => setOpen(true)}
      >
        <Palette size={20} />
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
            setError("");
          }
        }}
      >
        <DialogContent className="en-message-settings">
          <DialogHeader>
            <DialogTitle>
              {thread ? "Conversation settings" : "Class messaging"}
            </DialogTitle>
            <DialogDescription>
              {thread
                ? "Choose a shared background for this conversation."
                : "Choose the shared default background for this class inbox."}{" "}
              Everyone in the conversation sees theme changes.
            </DialogDescription>
          </DialogHeader>
          {query.isError ? (
            <p role="alert">{examError(query.error)}</p>
          ) : (
            <>
              <h3>Background</h3>
              <div className="en-chat-theme-grid">
                {chatThemes.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    disabled={busy}
                    aria-pressed={selected === t.id}
                    onClick={() =>
                      void save(() => messaging.setTheme(classId, t.id, thread))
                    }
                  >
                    <span style={{ background: t.color }}>
                      {selected === t.id && <Check size={18} />}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
              {thread && (
                <button
                  disabled={busy}
                  className="en-outline-button"
                  onClick={() =>
                    void save(() => messaging.setTheme(classId, "", thread))
                  }
                >
                  {!selected
                    ? "Using class background"
                    : "Use class background"}
                </button>
              )}
              {query.data?.role === "teacher" && (
                <section className="en-message-permissions">
                  <h3>Student messages</h3>
                  {!peerId && (
                    <label className="en-permission-row">
                      <span>
                        <strong>Allow student messages</strong>
                        <small>Applies to all students in this class.</small>
                      </span>
                      <input
                        type="checkbox"
                        aria-label="Allow student messages"
                        checked={query.data.students_can_message}
                        disabled={busy}
                        onChange={(e) =>
                          void save(() =>
                            messaging.policy(classId, e.target.checked),
                          )
                        }
                      />
                    </label>
                  )}
                  {!query.data.students_can_message && (
                    <p className="en-chat-policy-note">
                      Student messages are paused for this class. Teachers can
                      still send messages.
                    </p>
                  )}
                  {!peerId && (
                    <label className="en-search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search student permissions"
                        placeholder="Search student or roll"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  )}
                  <div className="en-student-permissions">
                    {students.map((s) => (
                      <label className="en-permission-row" key={s.id}>
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.roll ? `Roll ${s.roll}` : "Student"}</small>
                        </span>
                        <input
                          type="checkbox"
                          aria-label={`Allow messages from ${s.name}`}
                          disabled={busy}
                          checked={s.can_message}
                          onChange={(e) =>
                            void save(() =>
                              messaging.studentPolicy(
                                classId,
                                s.id,
                                e.target.checked,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    {students.length === 0 && <p>No matching students.</p>}
                  </div>
                </section>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="en-chat-error">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
