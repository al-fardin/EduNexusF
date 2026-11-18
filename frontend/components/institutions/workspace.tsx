"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  institutions,
  type InstitutionWorkspace,
  type InstitutionClass,
} from "@/services/institutions";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { examError } from "@/services/exams";
import { InstitutionPeople, InstitutionInviteInbox } from "./people";
import { InstitutionSettings, InstitutionHistory } from "./settings";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function InstitutionsWorkspace() {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    params = useSearchParams(),
    router = useRouter(),
    client = useQueryClient(),
    id = params.get("id") ?? "",
    tab = params.get("tab") ?? "classes";
  const [name, setName] = useState(""),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const list = useInfiniteQuery({
    queryKey: ["institutions", user],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => institutions.list(pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: !!user,
  });
  const info = useQuery({
    queryKey: ["institution", user, id],
    queryFn: () => institutions.get(id),
    enabled: !!user && !!id,
  });
  const admin = info.data?.role === "owner" || info.data?.role === "admin";
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("Institutions")}</h1>
          <Button className="min-h-11" onClick={() => setCreating((v) => !v)}>
            {t("Create institution")}
          </Button>
        </header>
        {creating && (
          <form
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              void institutions
                .create(name)
                .then(async (saved) => {
                  await client.invalidateQueries({
                    queryKey: ["institutions"],
                  });
                  setCreating(false);
                  setName("");
                  router.push(`/institutions?id=${saved.id}`);
                })
                .catch((e) => setError(examError(e)))
                .finally(() => setBusy(false));
            }}
          >
            <label className="grid gap-1 text-sm">
              {t("Institution name")}
              <input
                required
                minLength={2}
                maxLength={140}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </label>
            {error && <ErrorState message={error} />}
            <Button type="submit" className="min-h-11" disabled={busy}>
              {t("Create institution")}
            </Button>
          </form>
        )}
        <InstitutionInviteInbox />
        {list.isPending ? (
          <ContentSkeleton rows={2} />
        ) : list.isError ? (
          <ErrorState
            message={examError(list.error)}
            onRetry={() => void list.refetch()}
          />
        ) : (
          <nav
            aria-label={t("Choose institution")}
            className="flex flex-wrap gap-2"
          >
            {list.data.pages
              .flatMap((p) => p.items)
              .map((i) => (
                <Link
                  key={i.id}
                  href={`/institutions?id=${i.id}`}
                  aria-current={i.id === id ? "page" : undefined}
                  className={`en-outline-button max-w-full break-words whitespace-normal ${i.id === id ? "border-primary text-primary" : ""}`}
                >
                  {i.name} · {t(i.role)}
                </Link>
              ))}
            {!list.data.pages[0].items.length && !id && (
              <EmptyState
                title={t("No institutions yet")}
                description={t("Classes work normally without an institution.")}
              />
            )}
          </nav>
        )}
        {list.hasNextPage && (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {t("More institutions")}
          </Button>
        )}
        {id &&
          (info.isPending ? (
            <ContentSkeleton rows={3} />
          ) : info.isError ? (
            <ErrorState
              message={examError(info.error)}
              onRetry={() => void info.refetch()}
            />
          ) : (
            <section className="space-y-4">
              <header>
                <h2 className="break-words text-xl font-semibold">
                  {info.data.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(info.data.role)}
                </p>
              </header>
              <nav className="flex flex-wrap gap-2">
                {[
                  ["classes", "Classes"],
                  ...(admin
                    ? [
                        ["people", "People"],
                        ["settings", "Institution settings"],
                        ["history", "Activity history"],
                      ]
                    : []),
                ].map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/institutions?id=${id}&tab=${key}`}
                    className={`en-outline-button ${tab === key ? "border-primary text-primary" : ""}`}
                  >
                    {t(label)}
                  </Link>
                ))}
              </nav>
              {tab === "people" && admin ? (
                <InstitutionPeople key={user + id} org={info.data} />
              ) : tab === "settings" && admin ? (
                <InstitutionSettings
                  key={user + id + info.data.version}
                  org={info.data}
                />
              ) : tab === "history" && admin ? (
                <InstitutionHistory id={id} />
              ) : (
                <InstitutionCatalogue key={user + id} org={info.data} />
              )}
            </section>
          ))}
      </div>
    </main>
  );
}
function InstitutionCatalogue({ org }: { org: InstitutionWorkspace }) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    [department, setDepartment] = useState(""),
    [term, setTerm] = useState(""),
    [q, setQ] = useState(""),
    [detach, setDetach] = useState<InstitutionClass | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["institution-classes", user, org.id, department, term, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      institutions.classes(org.id, pageParam, department, term, q),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <label className="grid min-w-0 gap-1 text-sm">
          {t("Search classes")}
          <input
            type="search"
            value={q}
            maxLength={200}
            onChange={(e) => setQ(e.target.value)}
            className={field}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          {t("Department")}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={field}
          >
            <option value="">{t("All departments")}</option>
            {org.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          {t("Institution semester")}
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className={field}
          >
            <option value="">{t("All semesters")}</option>
            {org.terms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.starts_on}
              </option>
            ))}
          </select>
        </label>
      </div>
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.pages.some((p) => p.items.length) ? (
        <EmptyState
          title={t("No institution classes yet")}
          description={t(
            "Class owners can choose an institution during creation or in Advanced class settings.",
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data.pages
            .flatMap((p) => p.items)
            .map((c) => (
              <article
                key={c.id}
                className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4"
              >
                <h3 className="break-words font-semibold">
                  {c.url ? (
                    <Link href={c.url} className="text-primary">
                      {c.name}
                    </Link>
                  ) : (
                    c.name
                  )}
                </h3>
                <p className="break-words text-sm text-muted-foreground">
                  {[c.subject, c.section, c.department, c.semester]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-xs">
                  {t(c.status === "archived" ? "Archived" : "Active")} ·{" "}
                  {t(
                    c.url
                      ? c.role === "teacher"
                        ? "Teaching"
                        : "Learning"
                      : "Class access required",
                  )}
                </p>
                {(org.role === "owner" || org.role === "admin") && (
                  <Button
                    variant="ghost"
                    className="min-h-11 whitespace-normal"
                    onClick={() => setDetach(c)}
                  >
                    {t("Make standalone")}
                  </Button>
                )}
              </article>
            ))}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="min-h-11"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("More classes")}
        </Button>
      )}
      <ReasonDialog
        open={!!detach}
        onOpenChange={(v) => {
          if (!v) setDetach(null);
        }}
        title={t("Make class standalone")}
        description={t(
          "Only organization placement changes. Class ownership, students and coursework are retained.",
        )}
        onConfirm={async (reason) => {
          if (!detach) return;
          await institutions.detach(org.id, detach, reason);
          setDetach(null);
          await Promise.all(
            [
              "institution-classes",
              "class-institution",
              "institutions",
              "institution-history",
            ].map((k) => client.invalidateQueries({ queryKey: [k] })),
          );
        }}
      />
    </div>
  );
}
