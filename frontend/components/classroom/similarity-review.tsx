"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { assignments } from "@/services/assignments";
import {
  academicReviews,
  type SimilarityPair,
  type SimilarityResult,
} from "@/services/academic-reviews";
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
export function SimilarityReview({ classId }: { classId: string }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false),
    [assignment, setAssignment] = useState("");
  const items = useQuery({
    queryKey: ["assignments", classId],
    queryFn: () => assignments.list(classId),
    enabled: open,
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("Similarity review")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("Similarity review")}</DialogTitle>
            <DialogDescription>
              {t(
                "Matching text is a review aid, not proof of misconduct. Files are not scanned and marks do not change.",
              )}
            </DialogDescription>
          </DialogHeader>
          <select
            aria-label={t("Assignment")}
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            className="rounded-xl border border-border bg-card p-3 text-sm"
          >
            <option value="">{t("Choose an assignment")}</option>
            {items.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          {items.isError && <ErrorState message={examError(items.error)} />}{" "}
          {assignment && (
            <SimilarityCohort
              key={assignment}
              classId={classId}
              assignment={assignment}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function SimilarityCohort({
  classId,
  assignment,
}: {
  classId: string;
  assignment: string;
}) {
  const query = useQuery({
    queryKey: ["similarity-roster", classId, assignment],
    queryFn: () => academicReviews.roster(classId, assignment),
  });
  return query.isPending ? (
    <ContentSkeleton rows={3} />
  ) : query.isError ? (
    <ErrorState message={examError(query.error)} />
  ) : (
    <Comparison
      key={query.dataUpdatedAt}
      classId={classId}
      assignment={assignment}
      roster={query.data}
    />
  );
}
function Comparison({
  classId,
  assignment,
  roster,
}: {
  classId: string;
  assignment: string;
  roster: Array<{ student_id: string; name: string; version: number }>;
}) {
  const { t } = usePreferences();
  const [selected, setSelected] = useState<string[]>(() =>
      roster.length <= 100 ? roster.map((s) => s.student_id) : [],
    ),
    [search, setSearch] = useState(""),
    [data, setData] = useState<SimilarityResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function compare() {
    setBusy(true);
    setError("");
    try {
      setData(await academicReviews.compare(classId, assignment, selected));
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t(
          "Select 2–100 students. Only latest text answers with at least 20 words are compared.",
        )}
      </p>
      <input
        aria-label={t("Search students")}
        placeholder={t("Search students")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-border bg-card p-3 text-sm"
      />
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-3">
        {roster
          .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
          .map((s) => (
            <label
              key={s.student_id}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.student_id)}
                disabled={
                  busy ||
                  (!selected.includes(s.student_id) && selected.length >= 100)
                }
                onChange={(e) => {
                  setData(null);
                  setSelected(
                    e.target.checked
                      ? [...selected, s.student_id]
                      : selected.filter((id) => id !== s.student_id),
                  );
                }}
              />
              {s.name} · v{s.version}
            </label>
          ))}
      </div>
      <Button
        disabled={busy || selected.length < 2}
        onClick={() => void compare()}
      >
        {busy ? t("Comparing…") : t("Compare answers")} ({selected.length})
      </Button>
      {error && <ErrorState message={error} />}{" "}
      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.compared} {t("compared")} · {data.insufficient_text}{" "}
            {t("insufficient text")} · {data.matching_pairs}{" "}
            {t("matching pairs")}
          </p>
          {data.truncated && (
            <p className="text-sm">
              {t(
                "Showing the 50 closest pairs. Narrow the selection to review more.",
              )}
            </p>
          )}
          {!data.pairs.length ? (
            <EmptyState title={t("No pairs above the review threshold")} />
          ) : (
            data.pairs.map((pair) => (
              <PairReview
                key={pair.low + pair.high}
                pair={pair}
                classId={classId}
                assignment={assignment}
                onSaved={() => void compare()}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
function PairReview({
  pair,
  classId,
  assignment,
  onSaved,
}: {
  pair: SimilarityPair;
  classId: string;
  assignment: string;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [note, setNote] = useState(pair.review?.note ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <article className="space-y-3 rounded-2xl border border-border p-4">
      <header className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">
          {pair.percent.toFixed(1)}% {t("text overlap")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {pair.review ? t("Reviewed") : t("Needs review")}
        </span>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {[pair.a, pair.b].map((answer) => (
          <section
            key={answer.id}
            className="min-w-0 rounded-xl bg-secondary p-3"
          >
            <h4 className="text-sm font-semibold">
              {answer.name} · v{answer.version}
            </h4>
            <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm">
              {answer.answer}
            </pre>
          </section>
        ))}
      </div>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void academicReviews
            .reviewPair(classId, assignment, pair, note)
            .then(onSaved)
            .catch((e) => setError(examError(e)))
            .finally(() => setBusy(false));
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("Review note")}
          <textarea
            required
            minLength={5}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl border border-border bg-card p-3"
          />
        </label>
        {error && <ErrorState message={error} />}
        <Button type="submit" variant="outline" disabled={busy}>
          {t("Save review")}
        </Button>
      </form>
    </article>
  );
}
