"use client";
import { useState } from "react";
import type { ExamQuestion, QuestionImage } from "@/services/exams";
import { prepareQuestionImage } from "@/lib/question-images";
import { QuestionPicture, QuestionText } from "./question-content";
import { field, outline } from "./exam-presentation";

export function QuestionImageEditor({
  image,
  onChange,
  label,
  onBusyChange,
}: {
  image?: QuestionImage;
  onChange: (image?: QuestionImage) => void;
  label: string;
  onBusyChange?: (delta: number) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="min-w-0 space-y-2">
      <label className="grid gap-1 text-sm">
        {label}
        <input
          className={`${field} min-w-0 text-xs`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            onBusyChange?.(1);
            setError("");
            void prepareQuestionImage(f)
              .then(onChange)
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Image could not be read",
                ),
              )
              .finally(() => {
                setBusy(false);
                onBusyChange?.(-1);
              });
          }}
        />
      </label>
      {busy && (
        <p role="status" className="text-xs">
          Preparing image…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {image && (
        <>
          <QuestionPicture image={image} />
          <label className="block text-sm">
            Image description
            <input
              className={field}
              value={image.alt}
              maxLength={150}
              onChange={(e) => onChange({ ...image, alt: e.target.value })}
            />
          </label>
          <button
            type="button"
            className={outline}
            onClick={() => onChange(undefined)}
          >
            Remove image
          </button>
        </>
      )}
    </div>
  );
}
export function QuestionMediaFields({
  question: q,
  onChange,
  onBusyChange,
}: {
  question: ExamQuestion;
  onChange: (patch: Partial<ExamQuestion>) => void;
  onBusyChange?: (delta: number) => void;
}) {
  return (
    <>
      <label className="my-2 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={q.required ?? false}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        Required question
      </label>
      <details className="my-3 min-w-0 rounded-xl border border-border p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Image, equation and section
        </summary>
        <div className="space-y-3 pt-2">
          <fieldset className="grid min-w-0 gap-2 sm:grid-cols-2">
            <legend className="text-sm font-semibold">
              Syllabus tags (optional)
            </legend>
            {(["subject", "chapter", "topic"] as const).map((key) => (
              <label key={key} className="min-w-0 text-sm capitalize">
                {key}
                <input
                  className={field}
                  value={q[key] ?? ""}
                  maxLength={120}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="text-sm">
              Difficulty
              <select
                className={field}
                value={q.difficulty ?? ""}
                onChange={(e) =>
                  onChange({
                    difficulty: e.target.value
                      ? (e.target.value as ExamQuestion["difficulty"])
                      : undefined,
                  })
                }
              >
                <option value="">Unspecified</option>
                {["easy", "medium", "hard"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </fieldset>
          <QuestionImageEditor
            onBusyChange={onBusyChange}
            label="Question image (optional)"
            image={q.image}
            onChange={(image) => onChange({ image })}
          />
          <p className="text-xs text-muted-foreground">
            Write inline equations as $x^2$ or use $$…$$ for a full equation.
          </p>
          <label className="grid gap-1 text-sm">
            Insert equation
            <textarea
              rows={2}
              className={field}
              placeholder="\frac{a}{b}"
              maxLength={2000}
              id={`equation-${q.id}`}
            />
            <button
              className={outline}
              type="button"
              onClick={() => {
                const el = document.getElementById(
                  `equation-${q.id}`,
                ) as HTMLTextAreaElement | null;
                if (el?.value.trim())
                  onChange({ prompt: `${q.prompt}\n$$${el.value.trim()}$$` });
              }}
            >
              Append equation
            </button>
          </label>
          <div className="min-w-0 rounded-xl bg-secondary p-3 text-sm">
            <QuestionText text={q.prompt} />
          </div>
          <label className="block text-sm">
            Section / heading (optional)
            <input
              className={field}
              maxLength={120}
              value={q.section ?? ""}
              onChange={(e) => onChange({ section: e.target.value })}
            />
          </label>
        </div>
      </details>
    </>
  );
}
