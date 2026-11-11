"use client";
import { useState } from "react";
import { academic } from "@/services/academic-tools";
import type { WorkspaceClass } from "@/services/workspace";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function CalendarEventForm({
  classes,
  open,
  onOpenChange,
  onSaved,
}: {
  classes: WorkspaceClass[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("New event")}</DialogTitle>
          <DialogDescription>{t("Choose a class")}</DialogDescription>
        </DialogHeader>
        {error && <ErrorState message={error} />}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            void academic
              .createEvent(String(data.get("class")), {
                title: String(data.get("title")),
                description: String(data.get("description")),
                starts_at: new Date(String(data.get("start"))).toISOString(),
                ends_at: new Date(String(data.get("end"))).toISOString(),
              })
              .then(() => {
                onOpenChange(false);
                onSaved();
              })
              .catch((e) => setError(examError(e)))
              .finally(() => setBusy(false));
          }}
        >
          <label className="grid gap-1 text-sm">
            {t("Class")}
            <select
              name="class"
              aria-label={t("Class")}
              className="rounded-xl border border-border bg-card p-3"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {[
            ["title", "Title", "text"],
            ["start", "Starts", "datetime-local"],
            ["end", "Ends", "datetime-local"],
          ].map(([name, label, type]) => (
            <label key={name} className="grid gap-1 text-sm">
              {t(label)}
              <input
                required
                name={name}
                type={type}
                maxLength={name === "title" ? 200 : undefined}
                className="rounded-xl border border-border bg-card p-3"
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm">
            {t("Description")}
            <textarea
              name="description"
              maxLength={4000}
              className="rounded-xl border border-border bg-card p-3"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {t("Create event")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
