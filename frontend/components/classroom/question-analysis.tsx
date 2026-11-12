"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGradebook } from "@/services/gradebook";
import { academicReviews } from "@/services/academic-reviews";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
const percentage = (n: number | null) =>
  n === null ? "—" : `${n.toFixed(1)}%`;
export function QuestionAnalysis({ classId }: { classId: string }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false),
    [exam, setExam] = useState(""),
    [hardest, setHardest] = useState(true);
  const book = useQuery({
    queryKey: ["gradebook", classId],
    queryFn: () => getGradebook(classId),
    enabled: open,
  });
  const query = useQuery({
    queryKey: ["question-analysis", classId, exam],
    queryFn: () => academicReviews.analysis(classId, exam),
    enabled: open && !!exam,
  });
  const questions = [...(query.data?.questions ?? [])];
  if (hardest)
    questions.sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101));
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("Question analysis")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Question analysis")}</DialogTitle>
            <DialogDescription>
              {t(
                "Completed attempts only. Small samples need careful interpretation.",
              )}
            </DialogDescription>
          </DialogHeader>
          <select
            aria-label={t("Exam")}
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className="rounded-xl border border-border bg-card p-3 text-sm"
          >
            <option value="">{t("Choose an exam")}</option>
            {book.data?.columns
              .filter((c) => c.kind === "exam")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
          {book.isError && <ErrorState message={examError(book.error)} />}{" "}
          {!exam ? (
            <EmptyState title={t("Choose an exam")} />
          ) : query.isPending ? (
            <ContentSkeleton rows={3} />
          ) : query.isError ? (
            <ErrorState message={examError(query.error)} />
          ) : (
            query.data && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    {t("Completed attempts")}: {query.data.completed_attempts}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hardest}
                      onChange={(e) => setHardest(e.target.checked)}
                    />
                    {t("Lowest score first")}
                  </label>
                </div>
                <section className="grid gap-3 sm:grid-cols-2">
                  {[...query.data.topics]
                    .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101))
                    .map((topic) => (
                      <article
                        key={topic.topic}
                        className="rounded-xl bg-secondary p-3"
                      >
                        <h3 className="font-semibold">{topic.topic}</h3>
                        <p className="mt-1 text-sm">
                          {percentage(topic.percent)} · {topic.graded}/
                          {topic.responses} {t("graded")}
                        </p>
                      </article>
                    ))}
                </section>
                {questions.map((q) => (
                  <article
                    key={q.id}
                    className="space-y-3 rounded-2xl border border-border p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">{q.prompt}</h3>
                      <span className="text-sm">{percentage(q.percent)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {q.topic} · {q.kind} · {q.graded}/{q.attempts}{" "}
                      {t("graded")}
                      {q.small_sample ? ` · ${t("Small sample")}` : ""}
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {[
                        ["Answered", q.answered],
                        ["Unanswered", q.unanswered],
                        ...(q.kind === "mcq"
                          ? [
                              ["Correct", q.correct],
                              ["Incorrect", q.incorrect],
                            ]
                          : []),
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl bg-secondary p-2"
                        >
                          <dt className="text-xs text-muted-foreground">
                            {t(String(label))}
                          </dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {q.percent !== null && (
                      <progress
                        max={100}
                        value={q.percent}
                        aria-label={`${t("Average score")}: ${q.prompt}`}
                        className="h-2 w-full accent-primary"
                      />
                    )}
                    {q.options.length > 0 && (
                      <ul className="space-y-2">
                        {q.options.map((option) => (
                          <li
                            className="flex justify-between gap-3 rounded-xl border border-border p-2 text-sm"
                            key={option.index}
                          >
                            <span>
                              {option.text}
                              {option.correct
                                ? ` · ${t("Correct option")}`
                                : ""}
                            </span>
                            <strong>{option.count}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
