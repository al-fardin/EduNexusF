"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { academic } from "@/services/academic-tools";
import { resourceLink } from "@/lib/academic-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function WorkspaceSearch() {
  const { t, locale } = usePreferences(),
    params = useSearchParams(),
    router = useRouter(),
    user = useAuthStore((s) => s.user?.id);
  const q = params.get("q") ?? "",
    kind = params.get("kind") ?? "all",
    offset = Math.max(0, Number(params.get("offset")) || 0);
  const query = useQuery({
    queryKey: ["global-search", user, q, kind, offset],
    queryFn: () => academic.search(q, kind, offset),
    enabled: !!user && q.trim().length >= 2,
  });
  const href = (page: number) =>
    `/search?${new URLSearchParams({ q, kind, offset: String(page) })}`;
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">{t("Search")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Search your classes and coursework")}
          </p>
        </header>
        <form
          key={q + kind}
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            router.push(
              `/search?${new URLSearchParams({ q: String(form.get("q")).trim(), kind: String(form.get("kind")) })}`,
            );
          }}
        >
          <label className="grid min-w-0 gap-1 text-sm">
            {t("Search terms")}
            <input
              name="q"
              defaultValue={q}
              required
              minLength={2}
              maxLength={200}
              className="w-full rounded-xl border border-border bg-background p-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("Type")}
            <select
              name="kind"
              aria-label={t("Type")}
              defaultValue={kind}
              className="rounded-xl border border-border bg-background p-3"
            >
              {["all", "class", "post", "material", "assignment", "exam"].map(
                (k) => (
                  <option key={k} value={k}>
                    {t(
                      k === "all"
                        ? "All types"
                        : k[0].toUpperCase() + k.slice(1),
                    )}
                  </option>
                ),
              )}
            </select>
          </label>
          <Button type="submit" className="self-end">
            {t("Search")}
          </Button>
        </form>
        {q.trim().length < 2 ? (
          <EmptyState title={t("Search your classes and coursework")} />
        ) : query.isPending ? (
          <ContentSkeleton rows={4} />
        ) : query.isError ? (
          <ErrorState
            message={examError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data.items.length ? (
          <EmptyState title={t("No results")} />
        ) : (
          <div className="space-y-3">
            {query.data.items.map((item) => (
              <Link
                href={resourceLink(item)}
                key={item.kind + item.id}
                className="block space-y-2 rounded-2xl border border-border bg-card p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {t(item.kind[0].toUpperCase() + item.kind.slice(1))}
                  </span>
                  <span>· {item.classroom_name}</span>
                  <time>{new Date(item.at).toLocaleDateString(locale)}</time>
                </div>
                <h2 className="font-semibold">{item.title}</h2>
                {item.excerpt && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
        <div className="flex justify-between">
          {offset > 0 ? (
            <Link
              className="en-outline-button"
              href={href(Math.max(0, offset - 50))}
            >
              {t("Previous")}
            </Link>
          ) : (
            <span />
          )}
          {query.data && query.data.next_offset >= 0 && (
            <Link
              className="en-outline-button"
              href={href(query.data.next_offset)}
            >
              {t("More results")}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
