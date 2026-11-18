"use client";
import { QuestionImageEditor } from "./question-image-editor";
import { QuestionText, QuestionPicture } from "./question-content";
import type { ExamQuestion } from "@/services/exams";
import { field, outline } from "./exam-presentation";

export function correctIndices(q: ExamQuestion) {
  return q.selection === "multiple"
    ? (q.correct_options ?? [])
    : q.correct_option === undefined
      ? []
      : [q.correct_option];
}
export function MCQFields({
  question: q,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  question: ExamQuestion;
  onChange: (patch: Partial<ExamQuestion>) => void;
  onBusyChange?: (delta: number) => void;
  disabled?: boolean;
}) {
  const multiple = q.selection === "multiple";
  const keys = correctIndices(q);
  return (
    <fieldset disabled={disabled} className="mt-3 min-w-0 space-y-3">
      <legend className="text-sm font-semibold">Answer choices and key</legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-60 text-sm">
          Answer format
          <select
            className={field}
            value={q.selection ?? "single"}
            onChange={(e) => {
              const selection = e.target.value as NonNullable<
                ExamQuestion["selection"]
              >;
              onChange({
                selection,
                correct_option: selection === "multiple" ? undefined : keys[0],
                correct_options: selection === "multiple" ? keys : undefined,
              });
            }}
          >
            <option value="single">Multiple choice · one answer</option>
            <option value="multiple">Checkboxes · multiple answers</option>
            <option value="dropdown">Dropdown · one answer</option>
          </select>
        </label>
        <button
          type="button"
          className={outline}
          onClick={() =>
            onChange({
              selection: "single",
              options: ["True", "False"],
              option_images: undefined,
              correct_option: 0,
              correct_options: undefined,
            })
          }
        >
          True / false preset
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {multiple
          ? "Select every correct answer. Full points require the exact set; no partial credit."
          : "Select the correct answer."}
      </p>
      {q.options?.map((option, j) => (
        <div
          key={j}
          className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1"
        >
          <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
            <span className="sr-only">Correct option {j + 1}</span>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={`key-${q.id}`}
              checked={keys.includes(j)}
              onChange={() =>
                onChange(
                  multiple
                    ? {
                        correct_options: keys.includes(j)
                          ? keys.filter((n) => n !== j)
                          : [...keys, j].sort((a, b) => a - b),
                      }
                    : { correct_option: j },
                )
              }
            />
          </label>
          <input
            aria-label={`Option ${j + 1}`}
            maxLength={1000}
            className={`${field} min-w-0 flex-1`}
            value={option}
            onChange={(e) =>
              onChange({
                options: q.options?.map((v, n) =>
                  n === j ? e.target.value : v,
                ),
              })
            }
          />
          <button
            type="button"
            aria-label={`Remove option ${j + 1}`}
            className={`${outline} min-h-11 min-w-11 px-2`}
            disabled={(q.options?.length ?? 0) <= 2}
            onClick={() => {
              const next = keys
                .filter((n) => n !== j)
                .map((n) => (n > j ? n - 1 : n));
              onChange({
                options: q.options?.filter((_, n) => n !== j),
                option_images: Object.fromEntries(
                  Object.entries(q.option_images ?? {})
                    .filter(([key]) => Number(key) !== j)
                    .map(([key, v]) => [
                      String(Number(key) > j ? Number(key) - 1 : Number(key)),
                      v,
                    ]),
                ),
                correct_option: multiple ? undefined : next[0],
                correct_options: multiple ? next : undefined,
              });
            }}
          >
            ×
          </button>
          <details className="col-span-3 min-w-0 rounded-xl border border-border p-2">
            <summary className="min-h-11 cursor-pointer text-xs">
              Option {j + 1} image / equation preview
            </summary>
            <div className="min-w-0 space-y-2">
              <QuestionText text={option} />
              <QuestionImageEditor
                onBusyChange={onBusyChange}
                label={`Option ${j + 1} image`}
                image={q.option_images?.[j]}
                onChange={(image) => {
                  const images = { ...q.option_images };
                  if (image) images[j] = image;
                  else delete images[j];
                  onChange({ option_images: images });
                }}
              />
            </div>
          </details>
        </div>
      ))}
      <button
        type="button"
        className={outline}
        disabled={(q.options?.length ?? 0) >= 20}
        onClick={() => onChange({ options: [...(q.options ?? []), ""] })}
      >
        Add option
      </button>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={q.shuffle_options ?? false}
          onChange={(e) => onChange({ shuffle_options: e.target.checked })}
        />
        Shuffle choices for each attempt
      </label>
    </fieldset>
  );
}

export function QuestionOrder({
  index,
  count,
  onMove,
  onDuplicate,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="my-2 flex flex-wrap gap-2">
      <button
        type="button"
        className={outline}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        Move up
      </button>
      <button
        type="button"
        className={outline}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        Move down
      </button>
      <button
        type="button"
        className={outline}
        disabled={count >= 40}
        onClick={onDuplicate}
      >
        Duplicate
      </button>
    </div>
  );
}

// Stable ordering preserves option identity on refresh, autosave and reconnect.
export function optionOrder(q: ExamQuestion, attemptId: string) {
  const indices = (q.options ?? []).map((_, i) => i);
  if (!q.shuffle_options) return indices;
  let seed = 2166136261;
  for (const ch of `${attemptId}:${q.id}`)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
export function MCQAnswer({
  question: q,
  value,
  onChange,
  attemptId,
}: {
  question: ExamQuestion;
  value: string;
  onChange: (value: string) => void;
  attemptId: string;
}) {
  const order = optionOrder(q, attemptId);
  const selected = value ? value.split(",").map(Number) : [];
  if (q.selection === "dropdown")
    return (
      <label className="block text-sm">
        Select an answer
        <select
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Not answered</option>
          {order.map((i) => (
            <option key={i} value={i}>
              {q.options?.[i]}
            </option>
          ))}
        </select>
        {order.some(
          (i) => q.option_images?.[i] || q.options?.[i]?.includes("$"),
        ) && (
          <span className="mt-2 grid min-w-0 gap-2">
            {order.map((i) => (
              <span
                key={i}
                className="block min-w-0 rounded-lg border border-border p-2"
              >
                <QuestionText text={q.options?.[i] ?? ""} />
                <QuestionPicture image={q.option_images?.[i]} />
              </span>
            ))}
          </span>
        )}
      </label>
    );
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{q.prompt}</legend>
      {q.selection === "multiple" && (
        <p className="text-xs text-muted-foreground">
          Select all correct answers.
        </p>
      )}
      {order.map((i) => (
        <label
          key={i}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <input
            type={q.selection === "multiple" ? "checkbox" : "radio"}
            name={`answer-${q.id}`}
            checked={selected.includes(i)}
            onChange={() =>
              onChange(
                q.selection === "multiple"
                  ? (selected.includes(i)
                      ? selected.filter((n) => n !== i)
                      : [...selected, i]
                    )
                      .sort((a, b) => a - b)
                      .join(",")
                  : String(i),
              )
            }
          />
          <span className="min-w-0 break-words">
            <QuestionText text={q.options?.[i] ?? ""} />
            <QuestionPicture image={q.option_images?.[i]} />
          </span>
        </label>
      ))}
      <button
        type="button"
        className="min-h-11 px-2 text-xs underline"
        disabled={!value}
        onClick={() => onChange("")}
      >
        Clear answer
      </button>
    </fieldset>
  );
}
