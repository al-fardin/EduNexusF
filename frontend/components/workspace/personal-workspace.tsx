"use client";
import { PersonalEditor } from "./personal-editor";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  personalWorkspace,
  type PersonalItem,
} from "@/services/personal-workspace";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";

import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function PersonalWorkspace() {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    params = useSearchParams(),
    [q, setQ] = useState(""),
    [savedID, setSavedID] = useState("");
  const id = params.get("note") ?? "",
    creating = params.get("new") === "1";
  const list = useInfiniteQuery({
    queryKey: ["personal-items", user, q],
    queryFn: ({ pageParam }) => personalWorkspace.list(q, pageParam),
    initialPageParam: 0,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: !!user,
  });
  const note = useQuery({
    queryKey: ["personal-item", user, id],
    queryFn: () => personalWorkspace.get(id),
    enabled: !!id && !!user,
  });
  const blank: PersonalItem = {
    id: "",
    title: (params.get("title") ?? "").slice(0, 160),
    body: "",
    checklist: [],
    links: [],
    version: 0,
    context_class: params.get("class") ?? "",
    context_kind: params.get("kind") ?? "",
    context_id: params.get("resource") ?? "",
  };
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {t("Personal workspace")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Private notes, checklists, links and files")}
            </p>
          </div>
          <Link href="/personal?new=1" className="en-solid-button">
            {t("New note")}
          </Link>
        </header>
        {id && savedID === id && (
          <p role="status" className="text-sm text-primary">
            {t("Note saved")}
          </p>
        )}
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
          <section className="min-w-0 space-y-3">
            <label className="grid gap-1 text-sm">
              {t("Search notes")}
              <input
                type="search"
                value={q}
                maxLength={200}
                onChange={(e) => setQ(e.target.value)}
                className={field}
              />
            </label>
            {list.isPending ? (
              <ContentSkeleton rows={3} />
            ) : list.isError ? (
              <ErrorState
                message={examError(list.error)}
                onRetry={() => void list.refetch()}
              />
            ) : !list.data.pages.some((p) => p.items.length) ? (
              <EmptyState title={t("No personal notes yet")} />
            ) : (
              list.data.pages
                .flatMap((p) => p.items)
                .map((n) => (
                  <Link
                    href={`/personal?note=${n.id}`}
                    key={n.id}
                    aria-current={n.id === id ? "page" : undefined}
                    className={`block min-w-0 space-y-2 rounded-xl border bg-card p-4 ${n.id === id ? "border-primary" : "border-border"}`}
                  >
                    <h2 className="break-words font-semibold">{n.title}</h2>
                    <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                      {n.excerpt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.updated_at).toLocaleDateString(locale)}
                      {n.total
                        ? ` · ${t("Checklist")}: ${n.done}/${n.total}`
                        : ""}
                      {n.files ? ` · ${t("Files")}: ${n.files}` : ""}
                    </p>
                  </Link>
                ))
            )}
            {list.hasNextPage && (
              <Button
                className="min-h-11 min-w-11 whitespace-normal"
                variant="outline"
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {t("More notes")}
              </Button>
            )}
          </section>
          <section className="min-w-0">
            {creating ? (
              <PersonalEditor
                key={`${user}:${params.toString()}`}
                initial={blank}
                onSaved={setSavedID}
                files={[]}
              />
            ) : id ? (
              note.isPending ? (
                <ContentSkeleton rows={4} />
              ) : note.isError ? (
                <ErrorState
                  message={examError(note.error)}
                  onRetry={() => void note.refetch()}
                />
              ) : (
                <PersonalEditor
                  key={`${user}:${id}:${note.data.item.version}`}
                  initial={note.data.item}
                  onSaved={setSavedID}
                  files={note.data.files}
                />
              )
            ) : (
              <EmptyState title={t("Choose a note or create one")} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
