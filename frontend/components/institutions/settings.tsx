"use client";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  institutions,
  type InstitutionWorkspace,
  type InstitutionUnit,
} from "@/services/institutions";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState, ConfirmAction } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function InstitutionSettings({ org }: { org: InstitutionWorkspace }) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name"));
          setBusy(true);
          setError("");
          void institutions
            .rename(org.id, name, org.version)
            .then(() =>
              Promise.all(
                [
                  "institution",
                  "institutions",
                  "institution-choices",
                  "institution-history",
                ].map((k) => client.invalidateQueries({ queryKey: [k] })),
              ),
            )
            .catch((e) => setError(examError(e)))
            .finally(() => setBusy(false));
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("Institution name")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={140}
            defaultValue={org.name}
            disabled={busy}
            className={field}
          />
        </label>
        {error && <ErrorState message={error} />}
        <Button type="submit" className="min-h-11" disabled={busy}>
          {t("Save institution settings")}
        </Button>
      </form>
      <InstitutionUnits org={org} kind="departments" items={org.departments} />
      <InstitutionUnits org={org} kind="terms" items={org.terms} />
    </div>
  );
}
function InstitutionUnits({
  org,
  kind,
  items,
}: {
  org: InstitutionWorkspace;
  kind: "departments" | "terms";
  items: InstitutionUnit[];
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [editing, setEditing] = useState<InstitutionUnit | null>(null),
    [remove, setRemove] = useState<InstitutionUnit | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(value: Partial<InstitutionUnit>, deleting = false) {
    setBusy(true);
    setError("");
    try {
      await institutions.unit(org.id, kind, value, deleting);
      setEditing(null);
      setRemove(null);
      await Promise.all(
        ["institution", "institution-classes", "institution-history"].map((k) =>
          client.invalidateQueries({ queryKey: [k] }),
        ),
      );
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-semibold">
        {t(kind === "departments" ? "Departments" : "Institution semesters")}
      </h3>
      <form
        key={editing?.id ?? "new"}
        className="grid min-w-0 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void save({
            id: editing?.id,
            name: String(data.get("name")),
            version: editing?.version,
            starts_on: String(data.get("start") ?? ""),
            ends_on: String(data.get("end") ?? ""),
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("Name")}
          <input
            name="name"
            required
            minLength={kind === "terms" ? 2 : 1}
            maxLength={kind === "terms" ? 100 : 80}
            defaultValue={editing?.name ?? ""}
            disabled={busy}
            className={field}
          />
        </label>
        {kind === "terms" && (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm">
              {t("Starts on")}
              <input
                type="date"
                name="start"
                required
                defaultValue={editing?.starts_on ?? ""}
                disabled={busy}
                className={field}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              {t("Ends on")}
              <input
                type="date"
                name="end"
                required
                defaultValue={editing?.ends_on ?? ""}
                disabled={busy}
                className={field}
              />
            </label>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-11" disabled={busy}>
            {t(
              editing
                ? "Save changes"
                : kind === "terms"
                  ? "Add semester"
                  : "Add department",
            )}
          </Button>
          {editing && (
            <Button
              type="button"
              className="min-h-11"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              {t("Cancel")}
            </Button>
          )}
        </div>
      </form>
      {error && <ErrorState message={error} />}
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
        >
          <div className="min-w-0 text-sm">
            <p className="break-words font-medium">{item.name}</p>
            {kind === "terms" && (
              <p className="text-xs text-muted-foreground">
                {item.starts_on} – {item.ends_on}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(item)}
            >
              {t("Edit")}
            </Button>
            <Button
              className="min-h-11"
              variant="ghost"
              disabled={busy}
              onClick={() => setRemove(item)}
            >
              {t("Delete")}
            </Button>
          </div>
        </article>
      ))}
      <ConfirmAction
        open={!!remove}
        onOpenChange={(v) => {
          if (!v) setRemove(null);
        }}
        title={t("Delete department or semester")}
        description={remove?.name ?? ""}
        busy={busy}
        onConfirm={() => {
          if (remove) void save(remove, true);
        }}
      />
    </section>
  );
}
export function InstitutionHistory({ id }: { id: string }) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["institution-history", user, id],
    initialPageParam: "",
    queryFn: ({ pageParam }) => institutions.history(id, pageParam),
    getNextPageParam: (p) => p.next || undefined,
  });
  return (
    <section className="space-y-3">
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        query.data.pages
          .flatMap((p) => p.items)
          .map((e) => (
            <article
              key={e.id}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <p className="text-sm font-medium">
                {e.actor} · {e.action.replaceAll("_", " ")}
              </p>
              <time className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString(locale)}
              </time>
              {e.reason && <p className="break-words text-sm">{e.reason}</p>}
            </article>
          ))
      )}
      {query.hasNextPage && (
        <Button
          className="min-h-11"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("Older changes")}
        </Button>
      )}
    </section>
  );
}
