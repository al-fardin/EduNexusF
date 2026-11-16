"use client";
import Link from "next/link";
import { resourceLink } from "@/lib/academic-tools";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { academic } from "@/services/academic-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";

export function StudentCoursework({
  classId,
  student,
}: {
  classId: string;
  student: string;
}) {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["progress-coursework", user, classId, student, offset],
    queryFn: () => academic.coursework(classId, student, offset),
  });
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">{t("Coursework & feedback")}</h4>
      {query.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          message={examError(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.items.length ? (
        <EmptyState title={t("No published assignments")} />
      ) : (
        <>
          {query.data.items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 space-y-2 rounded-xl border border-border p-3 [overflow-wrap:anywhere]"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <Link
                  href={resourceLink({
                    id: item.id,
                    classroom_id: classId,
                    kind: "assignment",
                    role: user === student ? "student" : "teacher",
                  })}
                  className="font-medium text-primary underline"
                >
                  {item.title}
                </Link>
                <span className="text-sm">
                  {t(
                    (
                      {
                        graded: "Graded",
                        submitted: "Submitted",
                        missing: "Missing",
                        upcoming: "Upcoming",
                      } as Record<string, string>
                    )[item.state] ?? item.state,
                  )}
                  {item.score !== null && ` · ${item.score}/${item.maximum}`}
                </span>
              </div>
              <time className="text-xs text-muted-foreground">
                {t("Due")}: {new Date(item.due_at).toLocaleString(locale)}
              </time>
              {item.feedback && (
                <p className="whitespace-pre-wrap rounded-lg bg-secondary p-3 text-sm">
                  <span className="font-medium">{t("Teacher feedback")}: </span>
                  {item.feedback}
                </p>
              )}
              {item.rubric.length > 0 && (
                <details>
                  <summary className="min-h-9 cursor-pointer text-sm">
                    {t("Grading criteria")}
                  </summary>
                  <dl className="space-y-2 pt-2">
                    {item.rubric.map((r) => (
                      <div key={r.id} className="text-sm">
                        <dt className="font-medium">
                          {r.title}:{" "}
                          {item.score === null
                            ? "—"
                            : (item.rubric_scores[r.id] ?? "—")}
                          /{r.maximum}
                        </dt>
                        {r.description && (
                          <dd className="whitespace-pre-wrap text-muted-foreground">
                            {r.description}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </article>
          ))}
          <nav
            aria-label={t("Coursework pages")}
            className="flex justify-between gap-3"
          >
            {offset > 0 ? (
              <button
                className="en-outline-button"
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                {t("Previous")}
              </button>
            ) : (
              <span />
            )}
            {query.data.next_offset >= 0 && (
              <button
                className="en-outline-button"
                onClick={() => setOffset(query.data.next_offset)}
              >
                {t("More coursework")}
              </button>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
