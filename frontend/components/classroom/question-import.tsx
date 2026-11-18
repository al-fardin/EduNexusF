"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { duplicateWarnings } from "@/lib/question-duplicates";
import { questionBank } from "@/services/question-bank";
import { QuestionImportRow } from "./question-import-row";
import { QuestionScanImport } from "./question-scan-import";
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
  existingQuestions = [],
}: {
  classroomId: string;
  onImport: (rows: BankInput[]) => Promise<void> | void;
  label?: string;
  existingQuestions?: ExamQuestion[];
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
  const [allowDuplicates, setAllowDuplicates] = useState(false),
    [bankMatches, setBankMatches] = useState<{ prompt: string }[]>([]),
    [duplicateError, setDuplicateError] = useState("");
  const [imageJobs, setImageJobs] = useState(0);
  const prompts = JSON.stringify(rows.map((r) => r.question.prompt));
  useEffect(() => {
    if (!open || !rows.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void questionBank
        .duplicates(classroomId, JSON.parse(prompts), controller.signal)
        .then((matches) => {
          if (!controller.signal.aborted) {
            setBankMatches(matches);
            setDuplicateError("");
          }
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setDuplicateError(
              "Bank duplicate check unavailable. Check again before adding.",
            );
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, classroomId, prompts, rows.length]);
  const warnings = duplicateWarnings(
    rows.map((r) => r.question),
    existingQuestions,
    bankMatches,
  );
  const ready = (i: number) =>
    !rows[i].errors.length && (allowDuplicates || !warnings[i].length);
  const chosenIndices = selected.filter(ready);
  function editRow(
    index: number,
    patch: Partial<ExamQuestion>,
    meta?: { topic?: string; difficulty?: string },
  ) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) return row;
        const question = { ...row.question, ...patch },
          next = previewItems([{ ...row, ...meta, question }])[0];
        return {
          ...next,
          line: row.line,
          question: {
            ...next.question,
            id: question.id,
            tester: question.tester,
          },
        };
      }),
    );
  }
  function preview(next: ImportRow[]) {
    setRows(next);
    setAllowDuplicates(false);
    setBankMatches([]);
    setDuplicateError("");
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
                disabled={busy || imageJobs > 0}
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
                <option value="scan">Scan / photo / PDF (OCR)</option>
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
                disabled={busy || imageJobs > 0}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    setRows([]);
                    setSelected([]);
                  }
                  if (file)
                    void run(async () => preview(await readQuestionFile(file)));
                }}
              />
            </label>
          )}
          {source === "scan" && (
            <QuestionScanImport
              disabled={busy || imageJobs > 0}
              onInvalidate={() => {
                setRows([]);
                setSelected([]);
              }}
              onPreview={preview}
            />
          )}
          {source === "paste" && (
            <>
              <label className="block text-sm">
                Format
                <select
                  className={field}
                  value={format}
                  onChange={(e) => {
                    setFormat(e.target.value as typeof format);
                    setRows([]);
                    setSelected([]);
                  }}
                >
                  <option value="text">Aiken / labelled text</option>
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="json">EduNexus JSON</option>
                </select>
              </label>
              <textarea
                aria-label="Questions to import"
                className={field}
                rows={7}
                maxLength={2 * 1024 * 1024}
                value={input}
                disabled={busy || imageJobs > 0}
                onChange={(e) => {
                  setInput(e.target.value);
                  setRows([]);
                  setSelected([]);
                }}
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
                            source_bank_id: data.questions[i].source_bank_id,
                            source_bank_version:
                              data.questions[i].source_bank_version,
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
          <details className="text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer">
              Import format guidance
            </summary>
            <p>
              DOCX / text PDF use labelled choices and an ANSWER line. For
              scanned pages, choose Scan / photo / PDF. XLSX uses the
              lowest-numbered worksheet. Missing keys can be filled in the
              preview editor.
            </p>
          </details>
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
                  {chosenIndices.length} selected ·{" "}
                  {rows.filter((r) => r.errors.length).length} need correction
                </strong>
                <button
                  type="button"
                  className={outline}
                  onClick={() =>
                    setSelected(rows.flatMap((_, i) => (ready(i) ? [i] : [])))
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
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={(e) => setAllowDuplicates(e.target.checked)}
                />
                Allow possible duplicate questions
              </label>
              {duplicateError && (
                <p
                  role="status"
                  className="text-xs text-amber-700 dark:text-amber-300"
                >
                  {duplicateError}
                </p>
              )}
              <div className="max-h-[70vh] space-y-2 overflow-y-auto">
                {rows.map((r, i) => (
                  <QuestionImportRow
                    key={r.line}
                    row={r}
                    index={i}
                    checked={chosenIndices.includes(i)}
                    disabled={busy || !ready(i)}
                    editingDisabled={busy || imageJobs > 0}
                    onBusyChange={(delta) => setImageJobs((n) => n + delta)}
                    warnings={warnings[i]}
                    onSelect={() =>
                      setSelected((current) =>
                        current.includes(i)
                          ? current.filter((n) => n !== i)
                          : [...current, i],
                      )
                    }
                    onChange={(patch, meta) => editRow(i, patch, meta)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={primary}
                disabled={busy || imageJobs > 0 || !chosenIndices.length}
                onClick={() =>
                  void run(async () => {
                    const chosen = rows
                      .filter(
                        (r, i) => chosenIndices.includes(i) && !r.errors.length,
                      )
                      .map((r) => ({
                        question: {
                          ...r.question,
                          id: clientId(),
                        } as ExamQuestion,
                        topic: r.topic,
                        difficulty: r.difficulty,
                      }));
                    if (
                      new TextEncoder().encode(JSON.stringify(chosen)).length >
                      2 * 1024 * 1024
                    )
                      throw new Error(
                        "Selected questions and images exceed 2 MB. Select fewer rows.",
                      );
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
