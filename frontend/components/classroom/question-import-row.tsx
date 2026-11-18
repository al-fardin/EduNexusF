"use client";
import type { ImportRow } from "@/lib/question-import";
import type { ExamQuestion } from "@/services/exams";
import { MCQFields } from "./mcq-fields";
import { QuestionMediaFields } from "./question-image-editor";
import { QuestionText, QuestionPicture } from "./question-content";
import { field } from "./exam-presentation";

export function QuestionImportRow({
  row: r,
  index,
  checked,
  disabled,
  warnings,
  onSelect,
  onChange,
  onBusyChange,
  editingDisabled = false,
}: {
  row: ImportRow;
  index: number;
  checked: boolean;
  disabled: boolean;
  warnings: string[];
  onSelect: () => void;
  onBusyChange?: (delta: number) => void;
  editingDisabled?: boolean;
  onChange: (
    patch: Partial<ExamQuestion>,
    meta?: { topic?: string; difficulty?: string },
  ) => void;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-border p-3">
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 shrink-0"
          disabled={disabled}
          checked={checked}
          onChange={onSelect}
        />
        <span className="min-w-0 break-words text-sm">
          <strong>
            {index + 1}.{" "}
            <QuestionText text={r.question.prompt || "Missing question"} />
          </strong>
          <span className="block text-xs text-muted-foreground">
            {r.question.selection ?? r.question.kind} · {r.question.points}{" "}
            points
          </span>
        </span>
      </label>
      <QuestionPicture image={r.question.image} />
      {r.question.options?.map((o, j) => (
        <div key={j} className="min-w-0 break-words pl-6 text-xs">
          {String.fromCharCode(65 + j)}. <QuestionText text={o} />
          <QuestionPicture image={r.question.option_images?.[j]} />
        </div>
      ))}
      <p className="mt-1 text-xs">
        Answer key:{" "}
        {(r.question.selection === "multiple"
          ? r.question.correct_options
          : r.question.correct_option === undefined
            ? []
            : [r.question.correct_option]
        )
          ?.map((n) => String.fromCharCode(65 + n))
          .join(", ") || "Missing"}
      </p>
      {r.errors.map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
      {warnings.map((w) => (
        <p
          key={w}
          className="text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          Possible duplicate: {w}
        </p>
      ))}
      <details className="mt-2 min-w-0">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Edit question {index + 1}
        </summary>
        <fieldset disabled={editingDisabled} className="min-w-0 space-y-3 py-2">
          <label className="block text-sm">
            Question text
            <textarea
              className={field}
              rows={3}
              maxLength={10000}
              value={r.question.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Points
            <input
              className={field}
              type="number"
              min={1}
              max={100}
              value={r.question.points}
              onChange={(e) => onChange({ points: Number(e.target.value) })}
            />
          </label>
          {r.question.kind === "mcq" ? (
            <MCQFields
              onBusyChange={onBusyChange}
              question={r.question}
              onChange={onChange}
            />
          ) : (
            <label className="block text-sm">
              Marking key
              <textarea
                className={field}
                value={r.question.sample_answer ?? ""}
                maxLength={15000}
                onChange={(e) => onChange({ sample_answer: e.target.value })}
              />
            </label>
          )}
          <QuestionMediaFields
            onBusyChange={onBusyChange}
            question={r.question}
            onChange={onChange}
          />
          <label className="block text-sm">
            Explanation
            <textarea
              className={field}
              rows={2}
              maxLength={4000}
              value={r.question.explanation ?? ""}
              onChange={(e) => onChange({ explanation: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Topic
            <input
              className={field}
              maxLength={120}
              value={r.topic}
              onChange={(e) =>
                onChange({ topic: e.target.value }, { topic: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            Difficulty
            <select
              className={field}
              value={r.difficulty}
              onChange={(e) => onChange({}, { difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </fieldset>
      </details>
    </article>
  );
}
