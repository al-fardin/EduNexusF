"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientId } from "@/lib/client-id";
import {
  IMPORT_TEMPLATE,
  parseQuestionText,
  previewItems,
  type ImportRow,
} from "@/lib/question-import";
import { readQuestionFile } from "@/lib/question-import-files";
import { examError, examService, type ExamQuestion } from "@/services/exams";
import type { BankInput } from "@/services/question-bank";
import { field, outline, primary } from "./exam-presentation";

export function QuestionImport({
  classroomId,
  onImport,
  label = "Add selected questions",
}: {
  classroomId: string;
  onImport: (rows: BankInput[]) => Promise<void> | void;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    [source, setSource] = useState("file"),
    [format, setFormat] = useState<"csv" | "tsv" | "json" | "text">("text"),
    [input, setInput] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const exams = useQuery({
    queryKey: ["import-exams", classroomId],
    queryFn: () => examService.list(classroomId),
    enabled: open && source === "exam",
  });
  function preview(next: ImportRow[]) {
    setRows(next);
    setSelected(next.flatMap((r, i) => (r.errors.length ? [] : [i])));
    setNotice("");
  }
  async function run(work: () => Promise<void> | void) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="my-4 min-w-0 rounded-2xl border border-border bg-card p-4"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer font-semibold">
        Import / reuse questions
      </summary>
      {open && (
        <div className="space-y-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <label className="min-w-0 flex-1 basis-60 text-sm">
              Source
              <select
                className={field}
                value={source}
                disabled={busy}
                onChange={(e) => {
                  setSource(e.target.value);
                  setRows([]);
                  setSelected([]);
                  setError("");
                }}
              >
                <option value="file">Upload file</option>
                <option value="paste">Paste questions</option>
                <option value="exam">Existing exam in this class</option>
              </select>
            </label>
            <button
              className={outline}
              type="button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([IMPORT_TEMPLATE], {
                    type: "text/csv;charset=utf-8",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "mcq-template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              CSV template
            </button>
          </div>
          {source === "file" && (
            <label className="block text-sm">
              CSV, TSV, XLSX, JSON, TXT/Aiken, DOCX or PDF · up to 2 MB
              <input
                className={`${field} mt-1 min-w-0 text-xs`}
                type="file"
                accept=".csv,.tsv,.xlsx,.json,.txt,.aiken,.docx,.pdf"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    void run(async () => preview(await readQuestionFile(file)));
                }}
              />
            </label>
          )}
          {source === "paste" && (
            <>
              <label className="block text-sm">
                Format
                <select
                  className={field}
                  value={format}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                >
                  <option value="text">Aiken / labelled text</option>
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="json">EduNexus / Google Forms API JSON</option>
                </select>
              </label>
              <textarea
                aria-label="Questions to import"
                className={field}
                rows={7}
                maxLength={2 * 1024 * 1024}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"Which is prime?\nA. 2\nB. 4\nANSWER: A"}
              />
              <button
                type="button"
                disabled={busy || !input.trim()}
                className={outline}
                onClick={() =>
                  void run(() => preview(parseQuestionText(input, format)))
                }
              >
                Preview import
              </button>
            </>
          )}
          {source === "exam" && (
            <label className="block text-sm">
              Choose an exam
              <select
                className={field}
                defaultValue=""
                disabled={busy || exams.isPending}
                onChange={(e) => {
                  if (e.target.value)
                    void run(async () => {
                      const data = await examService.teacherExam(
                        classroomId,
                        e.target.value,
                      );
                      preview(
                        previewItems(data.questions).map((row, i) => ({
                          ...row,
                          question: {
                            ...row.question,
                            tester: data.questions[i].tester,
                          },
                        })),
                      );
                    });
                }}
              >
                <option value="">Select exam</option>
                {exams.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              {exams.isError && (
                <span role="alert">{examError(exams.error)}</span>
              )}
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Google Forms: upload its API JSON export. DOCX / PDF text needs
            labelled choices and an ANSWER line; scanned images are unsupported.
            XLSX uses the lowest-numbered worksheet. Review answer keys before
            adding.
          </p>
          {busy && <p role="status">Processing questions…</p>}
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
          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong>
                  {selected.length} selected ·{" "}
                  {rows.filter((r) => r.errors.length).length} need correction
                </strong>
                <button
                  type="button"
                  className={outline}
                  onClick={() =>
                    setSelected(
                      rows.flatMap((r, i) => (r.errors.length ? [] : [i])),
                    )
                  }
                >
                  Select valid
                </button>
                <button
                  type="button"
                  className={outline}
                  onClick={() => setSelected([])}
                >
                  Clear selection
                </button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {rows.map((r, i) => (
                  <article
                    key={i}
                    className="min-w-0 rounded-xl border border-border p-3"
                  >
                    <label className="flex min-h-11 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        disabled={busy || !!r.errors.length}
                        checked={selected.includes(i)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(i)
                              ? current.filter((n) => n !== i)
                              : [...current, i],
                          )
                        }
                      />
                      <span className="min-w-0 break-words text-sm">
                        <strong>
                          {i + 1}. {r.question.prompt || "Missing question"}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {r.question.selection ?? r.question.kind} ·{" "}
                          {r.question.points} points
                        </span>
                      </span>
                    </label>
                    {r.question.options?.map((o, j) => (
                      <p key={j} className="break-words pl-6 text-xs">
                        {String.fromCharCode(65 + j)}. {o}
                      </p>
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
                    {r.errors.map((message) => (
                      <p key={message} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
              <button
                type="button"
                className={primary}
                disabled={busy || !selected.length}
                onClick={() =>
                  void run(async () => {
                    const chosen = rows
                      .filter(
                        (r, i) => selected.includes(i) && !r.errors.length,
                      )
                      .map((r) => ({
                        question: {
                          ...r.question,
                          id: clientId(),
                        } as ExamQuestion,
                        topic: r.topic,
                        difficulty: r.difficulty,
                      }));
                    await onImport(chosen);
                    setRows([]);
                    setSelected([]);
                    setNotice(`${chosen.length} questions added`);
                  })
                }
              >
                {label}
              </button>
            </>
          )}
        </div>
      )}
    </details>
  );
}
