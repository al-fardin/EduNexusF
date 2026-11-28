"use client";
import { requestConfirm, requestText } from "@/lib/action-dialog";

import { LoadingIcon, LoadingIndicator } from "@/components/ui/loading-indicator";
import { clientId } from "@/lib/client-id";
import { QuestionImport } from "./question-import";
import { BankFiltersFields, BankEntryTools } from "./bank-catalogue-tools";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  questionBank,
  type BankItem,
  type BankFilters,
} from "@/services/question-bank";
import { examError, type ExamQuestion } from "@/services/exams";
const btn =
  "min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const field = "rounded-lg border border-border bg-card px-3 py-2 text-sm";
export function SaveBankQuestion({
  classroomId,
  question,
}: {
  classroomId: string;
  question: ExamQuestion;
}) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(question.topic ?? "");
  const [subject, setSubject] = useState(question.subject ?? ""),
    [chapter, setChapter] = useState(question.chapter ?? "");
  const [difficulty, setDifficulty] = useState(question.difficulty ?? "medium");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  return (
    <div className="mt-3">
      <button className={btn} type="button" onClick={() => setOpen((v) => !v)}>
        Save to question bank
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="Question subject"
            placeholder="Subject (optional)"
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={field}
          />
          <input
            aria-label="Question chapter"
            placeholder="Chapter (optional)"
            maxLength={120}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className={field}
          />{" "}
          <input
            aria-label="Question topic"
            placeholder="Topic"
            maxLength={120}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={field}
          />
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(
                e.target.value as NonNullable<ExamQuestion["difficulty"]>,
              )
            }
            className={field}
          >
            {["easy", "medium", "hard"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <button
            className={btn}
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await questionBank.save(classroomId, {
                  question: { ...question, subject, chapter },
                  topic,
                  difficulty,
                });
                setNotice("Saved to bank");
                await client.invalidateQueries({
                  queryKey: ["question-bank", classroomId],
                });
              } catch (e) {
                setNotice(examError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {(busy) && <LoadingIcon size={16}/>} {busy ? "Saving…" : "Save question"}
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs">
          {notice}
        </p>
      )}
    </div>
  );
}
export function QuestionBank({
  classroomId,
  onAdd,
}: {
  classroomId: string;
  onAdd?: (questions: ExamQuestion[]) => void;
}) {
  const [filters, setFilters] = useState<BankFilters>({});
  const topic = filters.topic ?? "",
    difficulty = filters.difficulty ?? "";
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ["question-bank", classroomId, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      questionBank.page(classroomId, filters, pageParam),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const add = (items: BankItem[]) =>
    onAdd?.(
      items.map((i) => ({
        ...i.question,
        source_bank_id: i.id,
        source_bank_version: i.version,
        difficulty: i.difficulty,
        id: clientId(),
      })),
    );
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["question-bank", classroomId] });
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="my-4 rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer font-semibold">Question bank</summary>
      <div className="mt-4 space-y-4">
        <BankFiltersFields
          classId={classroomId}
          value={filters}
          onChange={setFilters}
        />
        <QuestionImport
          classroomId={classroomId}
          label="Save selected to bank"
          onImport={async (rows) => {
            await questionBank.save(classroomId, rows);
            await refresh();
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={!items.length}
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(items, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "question-bank.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export shown questions
          </button>
        </div>
        {onAdd && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              aria-label="Random question count"
              type="number"
              min={1}
              max={40}
              className={`${field} w-20`}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <button
              className={btn}
              type="button"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  const drawn = await questionBank.draw(
                    classroomId,
                    count,
                    topic,
                    difficulty,
                    filters,
                  );
                  if (!drawn.length) throw new Error("No matching questions");
                  add(drawn);
                })
              }
            >
              Add random set
            </button>
            <span className="text-xs text-muted-foreground">
              Uses the filters above. Exam questions are independent copies.
            </span>
          </div>
        )}
        {list.isPending && (
          <LoadingIndicator message="Loading question bank"/>
        )}
        {(error || list.isError) && (
          <p role="alert" className="text-sm text-destructive">
            {error || examError(list.error)}
          </p>
        )}
        <div className="max-h-96 space-y-3 overflow-auto">
          {items.map((item) => (
            <article
              key={`${item.id}:${item.version}`}
              className="rounded-xl border border-border p-3"
            >
              <p className="text-xs text-muted-foreground">
                {item.topic || "General"} · {item.difficulty} ·{" "}
                {item.question.kind} · {item.question.points} points
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {item.question.prompt}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onAdd && (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => add([item])}
                  >
                    Add to exam
                  </button>
                )}
                <button
                  type="button"
                  className={btn}
                  disabled={busy}
                  onClick={async () => {
                    const prompt = await requestText(
                      "Edit question",
                      item.question.prompt,
                      { title: "Edit question", multiline: true },
                    );
                    if (prompt === null) return;
                    void perform(() =>
                      questionBank.save(
                        classroomId,
                        { ...item, question: { ...item.question, prompt } },
                        item.id,
                      ),
                    );
                  }}
                >
                  Edit question
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await requestConfirm(
                        "Remove this bank question? Existing exams keep their copies.",
                        { title: "Delete question", confirmLabel: "Delete question", destructive: true },
                      )
                    )
                      void perform(() =>
                        questionBank.remove(classroomId, item.id),
                      );
                  }}
                >
                  Delete
                </button>
              </div>
              <BankEntryTools classId={classroomId} item={item} />
            </article>
          ))}
        </div>
        {list.hasNextPage && (
          <button
            type="button"
            className={btn}
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            More questions
          </button>
        )}
        {items.length === 0 && !list.isPending && (
          <p className="text-sm text-muted-foreground">
            No questions saved. Use Save to question bank in the exam editor.
          </p>
        )}
      </div>
    </details>
  );
}
