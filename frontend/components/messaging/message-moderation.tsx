"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { ConfirmAction, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function ReportMessage({
  classId,
  thread,
  messageId,
}: {
  classId: string;
  thread: string;
  messageId: string;
}) {
  const { t } = usePreferences(),
    [open, setOpen] = useState(false),
    [reported, setReported] = useState(false);
  return (
    <>
      <button
        className="en-message-action-row"
        disabled={reported}
        onClick={() => setOpen(true)}
      >
        {t(reported ? "Report sent" : "Report message")}
      </button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={t("Report message")}
        description={t(
          "The reported message and your reason will be shared with the class moderation team.",
        )}
        onConfirm={async (reason) => {
          await api.post(
            `/classrooms/${classId}/conversations/${thread}/messages/${messageId}/report`,
            { reason },
          );
          setReported(true);
        }}
      />
    </>
  );
}
export function ConversationBlock({
  classId,
  thread,
}: {
  classId: string;
  thread: string;
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    user = useAuthStore((s) => s.user?.id),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["conversation-block", user, classId, thread],
    queryFn: async () =>
      (
        await api.get<{ data: { blocked_by_you: boolean; blocked: boolean } }>(
          `/classrooms/${classId}/conversations/${thread}/block`,
        )
      ).data.data,
    refetchInterval: 15000,
  });
  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("Conversation access")}</p>
        <Button
          variant="outline"
          disabled={query.isPending || query.isError || busy}
          onClick={() => setConfirm(true)}
        >
          {t(
            query.data?.blocked_by_you
              ? "Unblock conversation"
              : "Block conversation",
          )}
        </Button>
      </div>
      {query.data?.blocked && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Messages and calls are paused for this conversation.")}
        </p>
      )}
      {(error || query.isError) && (
        <ErrorState message={error || examError(query.error)} />
      )}
      <ConfirmAction
        open={confirm}
        onOpenChange={setConfirm}
        title={t(
          query.data?.blocked_by_you
            ? "Unblock conversation?"
            : "Block conversation?",
        )}
        description={t(
          "Existing messages remain readable. Each participant controls their own block.",
        )}
        busy={busy}
        onConfirm={() => {
          setBusy(true);
          setError("");
          void api
            .put(`/classrooms/${classId}/conversations/${thread}/block`, {
              blocked: !query.data?.blocked_by_you,
            })
            .then(() => {
              setConfirm(false);
              return client.invalidateQueries({
                queryKey: ["conversation-block"],
              });
            })
            .catch((e) => setError(examError(e)))
            .finally(() => setBusy(false));
        }}
      />
    </section>
  );
}
