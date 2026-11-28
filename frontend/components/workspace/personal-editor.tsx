"use client";
import { requestConfirm } from "@/lib/action-dialog";

import { LoadingIcon } from "@/components/ui/loading-indicator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  personalWorkspace,
  type PersonalItem,
  type PersonalFile,
} from "@/services/personal-workspace";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ConfirmAction, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
import { PersonalCollections, PersonalAttachments } from "./personal-fields";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function PersonalEditor({
  initial,
  files,
  onSaved,
}: {
  initial: PersonalItem;
  files: PersonalFile[];
  onSaved?: (id: string) => void;
}) {
  const { t } = usePreferences(),
    router = useRouter(),
    client = useQueryClient(),
    [item, setItemState] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remove, setRemove] = useState(false),
    [fileDelete, setFileDelete] = useState<PersonalFile | null>(null);
  function setItem(next: PersonalItem) {
    setItemState(next);
    onSaved?.("");
  }
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const dirty = JSON.stringify(item) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    let active = true;
    let pendingNavigation = false;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey ||
        !(e.target instanceof Element) ||
        !e.target.closest("a[href]") ||
        e.target.closest('a[target="_blank"]')
      )
        return;
      const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]")!;
      if (link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (pendingNavigation) return;
      pendingNavigation = true;
      void requestConfirm(t("Discard unsaved note changes?"), {title:"Unsaved changes",confirmLabel:"Discard changes",destructive:true}).then(confirmed => {
        pendingNavigation = false;
        if (!confirmed || !active) return;
        if (destination.origin === window.location.origin) router.push(destination.pathname + destination.search + destination.hash);
        else window.location.assign(destination.href);
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      active = false;
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, t, router]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await Promise.all([
        client.invalidateQueries({ queryKey: ["personal-items"] }),
        client.invalidateQueries({ queryKey: ["personal-item"] }),
      ]);
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
      setFileDelete(null);
    }
  }
  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4">
      {error && <ErrorState message={error} />}
      <form
        className="min-w-0 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            const saved = await personalWorkspace.save(item);
            if (!alive.current) return;
            setItem({ ...item, id: saved.id, version: saved.version });
            onSaved?.(saved.id);
            router.replace(`/personal?note=${saved.id}`);
          });
        }}
      >
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="sr-only">{t("Personal note")}</legend>
          <label className="grid gap-1 text-sm">
            {t("Title")}
            <input
              required
              maxLength={160}
              value={item.title}
              onChange={(e) => setItem({ ...item, title: e.target.value })}
              className={field}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("Notes")}
            <textarea
              rows={7}
              maxLength={20000}
              value={item.body}
              onChange={(e) => setItem({ ...item, body: e.target.value })}
              className={field}
            />
          </label>
          {item.context_kind && (
            <div className="space-y-2 rounded-xl bg-secondary p-3 text-sm">
              <p>
                {t("Linked context")}:{" "}
                {t(
                  item.context_kind === "class"
                    ? "Class"
                    : item.context_kind[0].toUpperCase() +
                        item.context_kind.slice(1),
                )}
              </p>
              {initial.context_excerpt && (
                <p className="whitespace-pre-wrap break-words text-muted-foreground">
                  {initial.context_excerpt}
                </p>
              )}
              {initial.context_url ? (
                <Link
                  className="text-primary underline"
                  href={initial.context_url}
                >
                  {t("Open linked item")}
                </Link>
              ) : (
                initial.id && (
                  <p className="text-muted-foreground">
                    {t("Linked item is currently unavailable")}
                  </p>
                )
              )}
              <Button
                className="min-h-11 min-w-11 whitespace-normal"
                type="button"
                variant="ghost"
                onClick={() =>
                  setItem({
                    ...item,
                    context_class: "",
                    context_kind: "",
                    context_id: "",
                  })
                }
              >
                {t("Remove link")}
              </Button>
            </div>
          )}
          <PersonalCollections item={item} onChange={setItem} />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="min-h-11 min-w-11 whitespace-normal"
              type="submit"
              disabled={!item.title.trim() || busy}
            >
              {(busy) && <LoadingIcon size={16}/>} {t(busy ? "Saving…" : "Save note")}
            </Button>
            {dirty && (
              <span role="status" className="text-xs text-muted-foreground">
                {t("Unsaved changes")}
              </span>
            )}
          </div>
        </fieldset>
      </form>
      <PersonalAttachments
        item={item}
        files={files}
        dirty={dirty}
        busy={busy}
        action={action}
        setError={setError}
        setFileDelete={setFileDelete}
      />
      {item.id && (
        <Button
          className="min-h-11 min-w-11 whitespace-normal"
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setRemove(true)}
        >
          {t("Delete note")}
        </Button>
      )}
      <ConfirmAction
        open={remove}
        onOpenChange={setRemove}
        busy={busy}
        title={t("Delete note")}
        description={t(
          "This permanently deletes the private note and its attached files.",
        )}
        onConfirm={() =>
          void action(async () => {
            await personalWorkspace.remove(item);
            if (alive.current) router.replace("/personal");
          })
        }
      />
      <ConfirmAction
        open={!!fileDelete}
        onOpenChange={(v) => {
          if (!v) setFileDelete(null);
        }}
        busy={busy}
        title={t("Delete private file")}
        description={fileDelete?.name ?? ""}
        onConfirm={() => {
          if (fileDelete)
            void action(() => personalWorkspace.removeFile(item, fileDelete));
        }}
      />
    </div>
  );
}
