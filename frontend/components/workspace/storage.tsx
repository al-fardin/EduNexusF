"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
type StorageClass = { id: string; name: string; quota: number; used: number };
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
export function StorageWorkspace() {
  const user = useAuthStore((s) => s.user?.id),
    { t } = usePreferences();
  const [selected, setSelected] = useState("");
  const query = useQuery({
    queryKey: ["storage", user],
    queryFn: async () =>
      (await api.get<{ data: StorageClass[] }>("/workspace/storage")).data.data,
  });
  const active = query.data?.find((c) => c.id === selected) ?? query.data?.[0];
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <h1 className="text-2xl font-semibold">{t("Storage")}</h1>
        {query.isPending ? (
          <ContentSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState message={examError(query.error)} />
        ) : !active ? (
          <EmptyState title={t("No owned classes")} />
        ) : (
          <>
            <select
              aria-label={t("Class")}
              value={active.id}
              onChange={(e) => setSelected(e.target.value)}
              className="min-h-11 max-w-full rounded-xl border border-border bg-card p-3 text-sm"
            >
              {query.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <StorageDetails
              key={active.id + ":" + active.quota}
              item={active}
            />
          </>
        )}
      </div>
    </main>
  );
}
function StorageDetails({ item }: { item: StorageClass }) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const files = useInfiniteQuery({
    queryKey: ["storage-files", item.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{
          data: {
            items: Array<{
              id: string;
              kind: string;
              title: string;
              bytes: number;
            }>;
            next_offset: number;
          };
        }>(`/classrooms/${item.id}/storage`, { params: { offset: pageParam } })
      ).data.data,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  return (
    <>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold">
          {mb(item.used)} / {mb(item.quota)}
        </p>
        <progress
          className="h-3 w-full accent-primary"
          max={item.quota}
          value={Math.min(item.used, item.quota)}
          aria-label={t("Storage used")}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            "Usage includes materials, submission versions, message files and question testers. Private message filenames are visible only to their participants.",
          )}
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const quota =
              Number(new FormData(e.currentTarget).get("quota")) * 1048576;
            setBusy(true);
            setError("");
            void api
              .put(`/classrooms/${item.id}/storage`, { quota })
              .then(() => client.invalidateQueries({ queryKey: ["storage"] }))
              .catch((e) => setError(examError(e)))
              .finally(() => setBusy(false));
          }}
        >
          <label className="grid gap-1 text-sm">
            {t("Class quota (MB)")}
            <input
              name="quota"
              type="number"
              min={10}
              max={2048}
              step={1}
              required
              defaultValue={Math.ceil(item.quota / 1048576)}
              disabled={busy}
              className="min-h-11 w-36 rounded-xl border border-border bg-background p-3"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {t("Save quota")}
          </Button>
        </form>
        {error && <ErrorState message={error} />}
      </section>
      <h2 className="font-semibold">{t("Largest stored files")}</h2>
      {files.isPending ? (
        <ContentSkeleton rows={3} />
      ) : files.isError ? (
        <ErrorState message={examError(files.error)} />
      ) : !files.data?.pages.some((p) => p.items.length) ? (
        <EmptyState title={t("No stored files")} />
      ) : (
        <div className="space-y-3">
          {files.data.pages
            .flatMap((p) => p.items)
            .map((f) => (
              <article
                key={f.kind + f.id}
                className="space-y-2 rounded-xl border border-border bg-card p-4"
              >
                <h3 className="break-words text-sm font-semibold">{f.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {t(f.kind)} · {mb(f.bytes)}
                </p>
                {f.kind === "material" && (
                  <Link
                    href={`/instructor/classrooms/${item.id}?tab=classwork&work=materials`}
                    className="text-sm font-medium text-primary underline"
                  >
                    {t("Manage in class materials")}
                  </Link>
                )}
              </article>
            ))}
        </div>
      )}
      {files.hasNextPage && (
        <Button
          variant="outline"
          disabled={files.isFetchingNextPage}
          onClick={() => void files.fetchNextPage()}
        >
          {t("More files")}
        </Button>
      )}
    </>
  );
}
