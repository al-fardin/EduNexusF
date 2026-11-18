"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { examError, type ExamInfo, type ExamQuestion } from "@/services/exams";
import { ExamDraftPreview } from "./exam-preview";
import { field, outline, primary } from "./exam-presentation";
type SetPreview = {
  sets: { id: string; label: string; questions: ExamQuestion[] }[];
  receipt: string;
  warnings: string[];
  total_points: number;
};
export function ExamSets({ exam }: { exam: ExamInfo }) {
  const [count, setCount] = useState(2),
    [mode, setMode] = useState("shuffle"),
    [preview, setPreview] = useState<SetPreview | null>(null),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const client = useQueryClient();
  const base = `/classrooms/${exam.classroom_id}/exams/${exam.id}/sets`;
  return (
    <details className="my-3 min-w-0 rounded-xl border border-border p-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        Create A / B / C sets (optional)
      </summary>
      <div className="space-y-3 pt-2">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          <label className="min-w-0 text-sm">
            Number of sets
            <select
              className={field}
              value={count}
              disabled={busy}
              onChange={(e) => {
                setCount(Number(e.target.value));
                setPreview(null);
                setReviewed(false);
              }}
            >
              <option value={2}>A + B</option>
              <option value={3}>A + B + C</option>
            </select>
          </label>
          <label className="min-w-0 text-sm">
            Question selection
            <select
              className={field}
              value={mode}
              disabled={busy}
              onChange={(e) => {
                setMode(e.target.value);
                setPreview(null);
                setReviewed(false);
              }}
            >
              <option value="shuffle">
                Same questions, shuffled within sections
              </option>
              <option value="equivalent">
                Different bank questions matching syllabus & points
              </option>
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Every set keeps the question count, total marks and exam rules.
          Equivalent draws also match question type and any recorded
          syllabus/difficulty tags.
        </p>
        <button
          type="button"
          className={outline}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            setNotice("");
            setPreview(null);
            setReviewed(false);
            void api
              .post(`${base}/preview`, { count, mode })
              .then((r) => setPreview(r.data.data))
              .catch((e) => setError(examError(e)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Preparing…" : "Generate preview"}
        </button>
        {error && (
          <p role="alert" className="break-words text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
        {preview && (
          <>
            <p className="text-sm font-semibold">
              {preview.sets.length} sets · {preview.total_points} points each
            </p>
            {preview.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700 dark:text-amber-300">
                {w}
              </p>
            ))}
            <div className="space-y-2">
              {preview.sets.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <span className="text-sm font-semibold">
                    Set {s.label} · {s.questions.length} questions
                  </span>
                  <ExamDraftPreview
                    title={`${exam.title} · Set ${s.label}`}
                    duration={exam.duration_minutes}
                    questions={s.questions}
                  />
                </div>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed the questions and answer keys for every set
            </label>
            <p className="text-xs text-muted-foreground">
              Approval creates private drafts. They inherit this exam’s
              audience; choose sections/roll rules and publish each set
              separately. The source draft stays intact.
            </p>
            <button
              type="button"
              className={primary}
              disabled={busy || !reviewed}
              onClick={() => {
                setBusy(true);
                setError("");
                void api
                  .post(`${base}/approve`, {
                    sets: preview.sets,
                    receipt: preview.receipt,
                  })
                  .then(async () => {
                    setNotice(
                      "Private set drafts created. Set their audiences before publishing.",
                    );
                    setPreview(null);
                    setReviewed(false);
                    await client.invalidateQueries({
                      queryKey: ["classrooms", exam.classroom_id, "exams"],
                    });
                  })
                  .catch((e) => setError(examError(e)))
                  .finally(() => setBusy(false));
              }}
            >
              Approve & create private drafts
            </button>
          </>
        )}
      </div>
    </details>
  );
}
