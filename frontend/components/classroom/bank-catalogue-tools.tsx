"use client";

import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  questionBank,
  type BankItem,
  type BankFilters,
} from "@/services/question-bank";
import { examError } from "@/services/exams";
import { field, outline } from "./exam-presentation";

export function BankFiltersFields({
  classId,
  value,
  onChange,
}: {
  classId: string;
  value: BankFilters;
  onChange: (v: BankFilters) => void;
}) {
  const [search, setSearch] = useState(value.q ?? "");
  const taxonomy = useQuery({
    queryKey: ["question-bank", classId, "taxonomy"],
    queryFn: () => questionBank.taxonomy(classId),
  });
  const rows = taxonomy.data ?? [];
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-3">
      {(["subject", "chapter", "topic"] as const).map((key) => {
        const options = [
          ...new Set(
            rows
              .filter(
                (r) =>
                  (key === "subject" ||
                    !value.subject ||
                    r.subject === value.subject) &&
                  (key !== "topic" ||
                    !value.chapter ||
                    r.chapter === value.chapter),
              )
              .map((r) => r[key]),
          ),
        ].filter(Boolean);
        return (
          <label key={key} className="min-w-0 text-sm capitalize">
            {key}
            <select
              className={field}
              value={value[key] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: e.target.value,
                  ...(key === "subject"
                    ? { chapter: "", topic: "" }
                    : key === "chapter"
                      ? { topic: "" }
                      : {}),
                })
              }
            >
              <option value="">All {key}s</option>
              {options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        );
      })}
      <label className="min-w-0 text-sm">
        Search questions
        <input
          className={field}
          value={search}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onChange({ ...value, q: search });
            }
          }}
        />
      </label>
      <label className="min-w-0 text-sm">
        Difficulty
        <select
          className={field}
          value={value.difficulty ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              difficulty: e.target.value as BankItem["difficulty"],
            })
          }
        >
          <option value="">All difficulties</option>
          {["easy", "medium", "hard"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          className={outline}
          onClick={() => onChange({ ...value, q: search })}
        >
          Search
        </button>
        <button
          type="button"
          className={outline}
          onClick={() => {
            setSearch("");
            onChange({});
          }}
        >
          Reset filters
        </button>
      </div>
      {taxonomy.isError && (
        <p role="status" className="text-xs">
          Syllabus filters unavailable. Retry the bank list.
        </p>
      )}
    </div>
  );
}
export function BankEntryTools({
  classId,
  item,
}: {
  classId: string;
  item: BankItem;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useQueryClient();
  const usage = useQuery({
    queryKey: ["bank-usage", classId, item.id],
    queryFn: () => questionBank.usage(classId, item.id),
    enabled: open,
  });
  return (
    <div className="mt-2 min-w-0 space-y-2">
      <details>
        <summary className="min-h-11 cursor-pointer text-sm">
          Edit syllabus tags
        </summary>
        <div className="space-y-2">
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <BankTagForm
            item={item}
            busy={busy}
            onSave={async (tags) => {
              setBusy(true);
              setError("");
              try {
                await questionBank.save(
                  classId,
                  {
                    ...item,
                    question: {
                      ...item.question,
                      subject: tags.subject,
                      chapter: tags.chapter,
                    },
                    topic: tags.topic,
                    difficulty: tags.difficulty,
                  },
                  item.id,
                );
                await client.invalidateQueries({
                  queryKey: ["question-bank", classId],
                });
              } catch (e) {
                setError(examError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </details>
      <button
        type="button"
        className={outline}
        onClick={() => setOpen((v) => !v)}
      >
        Where used
      </button>
      {open && (
        <div className="space-y-2 text-xs">
          {usage.isPending ? (
            <LoadingIndicator message="Checking question usage"/>
          ) : usage.isError ? (
            <p role="alert">{examError(usage.error)}</p>
          ) : usage.data?.items.length ? (
            usage.data.items.map((e) => (
              <p key={e.id}>
                <strong>{e.title}</strong> · {e.status} ·{" "}
                {e.match === "source"
                  ? "Copied from this bank question"
                  : "Same text; older copy may have no source link"}
              </p>
            ))
          ) : (
            <p>No saved exam uses found.</p>
          )}
          {usage.data?.truncated && <p>Showing the most recent 100 exams.</p>}
        </div>
      )}
    </div>
  );
}
function BankTagForm({
  item,
  busy,
  onSave,
}: {
  item: BankItem;
  busy: boolean;
  onSave: (tags: {
    subject: string;
    chapter: string;
    topic: string;
    difficulty: string;
  }) => Promise<void>;
}) {
  const [tags, setTags] = useState({
    subject: item.question.subject ?? "",
    chapter: item.question.chapter ?? "",
    topic: item.topic,
    difficulty: item.difficulty,
  });
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
      {(["subject", "chapter", "topic"] as const).map((key) => (
        <label key={key} className="min-w-0 text-sm capitalize">
          {key}
          <input
            className={field}
            maxLength={120}
            value={tags[key]}
            disabled={busy}
            onChange={(e) => setTags({ ...tags, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="text-sm">
        Difficulty
        <select
          className={field}
          value={tags.difficulty}
          disabled={busy}
          onChange={(e) =>
            setTags({
              ...tags,
              difficulty: e.target.value as BankItem["difficulty"],
            })
          }
        >
          {["easy", "medium", "hard"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={outline}
        disabled={busy}
        onClick={() => void onSave(tags)}
      >
        Save tags
      </button>
    </div>
  );
}
