"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import {
  ConfirmAction,
  EmptyState,
  ErrorState,
} from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
type Staff = {
  id: string;
  name: string;
  owner: boolean;
  permissions: Record<string, boolean>;
};
export function StaffPermissions({
  classId,
  open,
  onOpenChange,
}: {
  classId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["staff-permissions", classId],
    queryFn: async () =>
      (
        await api.get<{ data: Staff[] }>(
          `/classrooms/${classId}/staff-permissions`,
        )
      ).data.data,
    enabled: open,
  });
  function changed() {
    void client.invalidateQueries({ queryKey: ["staff-permissions", classId] });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Co-teacher permissions")}</DialogTitle>
          <DialogDescription>
            {t(
              "Add a verified instructor and choose their classroom permissions.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const email = String(new FormData(e.currentTarget).get("email"));
            setBusy(true);
            setError("");
            void api
              .post(`/classrooms/${classId}/staff-permissions`, { email })
              .then(changed)
              .catch((e) => setError(examError(e)))
              .finally(() => setBusy(false));
          }}
        >
          <label className="grid min-w-0 flex-1 gap-1 text-sm">
            {t("Instructor email")}
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              disabled={busy}
              className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {t("Add co-teacher")}
          </Button>
        </form>
        {error && <ErrorState message={error} />}
        <p className="text-xs text-muted-foreground">
          {t(
            "Existing co-teachers keep their access until you save new permissions. The owner always keeps full access.",
          )}
        </p>
        {query.isPending ? (
          <ContentSkeleton rows={2} />
        ) : query.isError ? (
          <ErrorState message={examError(query.error)} />
        ) : !query.data?.length ? (
          <EmptyState title={t("No co-teachers")} />
        ) : (
          query.data.map((s) => (
            <StaffEditor
              key={s.id + JSON.stringify(s.permissions)}
              classId={classId}
              item={s}
              changed={changed}
            />
          ))
        )}
      </DialogContent>
    </Dialog>
  );
}
function StaffEditor({
  classId,
  item,
  changed,
}: {
  classId: string;
  item: Staff;
  changed: () => void;
}) {
  const { t } = usePreferences(),
    [permissions, setPermissions] = useState(item.permissions),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remove, setRemove] = useState(false);
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      changed();
      setRemove(false);
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-semibold">
        {item.name}
        {item.owner ? ` · ${t("Owner")}` : ""}
      </h3>
      {!item.owner && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(permissions).map(([key, value]) => (
              <label
                key={key}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={value}
                  disabled={busy}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, [key]: e.target.checked }))
                  }
                />
                {t(key)}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.put(
                    `/classrooms/${classId}/staff-permissions/${item.id}`,
                    { permissions },
                  ),
                )
              }
            >
              {t("Save permissions")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemove(true)}
            >
              {t("Remove co-teacher")}
            </Button>
          </div>
        </>
      )}
      {error && <ErrorState message={error} />}
      <ConfirmAction
        open={remove}
        onOpenChange={setRemove}
        title={t("Remove co-teacher?")}
        description={t("Their access to this classroom will end.")}
        busy={busy}
        onConfirm={() =>
          void act(() =>
            api.delete(`/classrooms/${classId}/staff-permissions/${item.id}`),
          )
        }
      />
    </article>
  );
}
