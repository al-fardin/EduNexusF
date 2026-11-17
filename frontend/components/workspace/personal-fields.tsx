"use client";
import {
  type PersonalItem,
  type PersonalFile,
  personalWorkspace,
} from "@/services/personal-workspace";
import { usePreferences } from "@/providers/preferences-provider";
import { clientId } from "@/lib/client-id";
import { Button } from "@/components/ui/button";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function PersonalCollections({
  item,
  onChange: setItem,
}: {
  item: PersonalItem;
  onChange: (v: PersonalItem) => void;
}) {
  const { t } = usePreferences();
  return (
    <>
      <section className="min-w-0 space-y-2">
        <h3 className="font-semibold">{t("Checklist")}</h3>
        {item.checklist.map((v, index) => (
          <div key={v.id} className="flex min-w-0 items-center gap-2">
            <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                aria-label={`${t("Completed")}: ${v.text || index + 1}`}
                checked={v.done}
                onChange={(e) =>
                  setItem({
                    ...item,
                    checklist: item.checklist.map((c) =>
                      c.id === v.id ? { ...c, done: e.target.checked } : c,
                    ),
                  })
                }
                className="size-5 shrink-0"
              />
            </label>
            <input
              required
              aria-label={`${t("Checklist item")} ${index + 1}`}
              maxLength={500}
              value={v.text}
              onChange={(e) =>
                setItem({
                  ...item,
                  checklist: item.checklist.map((c) =>
                    c.id === v.id ? { ...c, text: e.target.value } : c,
                  ),
                })
              }
              className={field}
            />
            <Button
              className="min-h-11 min-w-11 whitespace-normal"
              type="button"
              variant="ghost"
              aria-label={`${t("Remove item")} ${index + 1}`}
              onClick={() =>
                setItem({
                  ...item,
                  checklist: item.checklist.filter((c) => c.id !== v.id),
                })
              }
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          className="min-h-11 min-w-11 whitespace-normal"
          type="button"
          variant="outline"
          disabled={item.checklist.length >= 100}
          onClick={() =>
            setItem({
              ...item,
              checklist: [
                ...item.checklist,
                { id: clientId(), text: "", done: false },
              ],
            })
          }
        >
          {t("Add checklist item")}
        </Button>
      </section>
      <section className="min-w-0 space-y-3">
        <h3 className="font-semibold">{t("Links")}</h3>
        {item.links.map((v, index) => (
          <div
            key={index}
            className="min-w-0 space-y-2 rounded-xl border border-border p-3"
          >
            <label className="grid gap-1 text-sm">
              {t("Link label")} {index + 1}
              <input
                maxLength={160}
                value={v.label}
                onChange={(e) =>
                  setItem({
                    ...item,
                    links: item.links.map((c, i) =>
                      i === index ? { ...c, label: e.target.value } : c,
                    ),
                  })
                }
                className={field}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("Web address")} {index + 1}
              <input
                required
                type="url"
                maxLength={2048}
                value={v.url}
                onChange={(e) =>
                  setItem({
                    ...item,
                    links: item.links.map((c, i) =>
                      i === index ? { ...c, url: e.target.value } : c,
                    ),
                  })
                }
                className={field}
              />
            </label>
            {/^https?:\/\//i.test(v.url) && (
              <a
                className="block break-all text-sm text-primary underline"
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {v.label || v.url}
              </a>
            )}
            <Button
              className="min-h-11 min-w-11 whitespace-normal"
              type="button"
              variant="ghost"
              onClick={() =>
                setItem({
                  ...item,
                  links: item.links.filter((_, i) => i !== index),
                })
              }
            >
              {t("Remove link")}
            </Button>
          </div>
        ))}
        <Button
          className="min-h-11 min-w-11 whitespace-normal"
          type="button"
          variant="outline"
          disabled={item.links.length >= 20}
          onClick={() =>
            setItem({
              ...item,
              links: [...item.links, { label: "", url: "" }],
            })
          }
        >
          {t("Add link")}
        </Button>
      </section>
    </>
  );
}
export function PersonalAttachments({
  item,
  files,
  dirty,
  busy,
  action,
  setError,
  setFileDelete,
}: {
  item: PersonalItem;
  files: PersonalFile[];
  dirty: boolean;
  busy: boolean;
  action: (fn: () => Promise<unknown>) => Promise<void>;
  setError: (s: string) => void;
  setFileDelete: (f: PersonalFile) => void;
}) {
  const { t } = usePreferences();
  return (
    <section className="min-w-0 space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">{t("Private files")}</h3>
      <p className="text-xs text-muted-foreground">
        {t(
          "Save the note before changing files. Up to 10 MB each and 50 MB total.",
        )}
      </p>
      <label className="grid gap-1 text-sm">
        {t("Attach file")}
        <input
          type="file"
          className={field}
          disabled={!item.id || dirty || busy || files.length >= 10}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              setError(t("File limit is 10 MB"));
              return;
            }
            void action(() => personalWorkspace.upload(item, file));
          }}
        />
      </label>
      {files.map((f) => (
        <div
          key={f.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
        >
          <p className="min-w-0 break-all text-sm">
            {f.name} · {Math.ceil(f.size / 1024)} KB
          </p>
          <div className="flex gap-2">
            <Button
              className="min-h-11 min-w-11 whitespace-normal"
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void action(() => personalWorkspace.download(item, f))
              }
            >
              {t("Download")}
            </Button>
            <Button
              className="min-h-11 min-w-11 whitespace-normal"
              type="button"
              variant="ghost"
              disabled={dirty || busy}
              onClick={() => setFileDelete(f)}
            >
              {t("Delete")}
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
