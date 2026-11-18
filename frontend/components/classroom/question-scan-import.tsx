"use client";
import { useEffect, useRef, useState } from "react";
import { recognizeQuestionScan, type ScanText } from "@/lib/question-ocr";
import { parseQuestionText, type ImportRow } from "@/lib/question-import";
import { field, outline } from "./exam-presentation";
export function QuestionScanImport({
  onPreview,
  disabled = false,
  onInvalidate,
}: {
  onPreview: (rows: ImportRow[]) => void;
  disabled?: boolean;
  onInvalidate?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [language, setLanguage] = useState<"eng" | "eng+ben">("eng"),
    [start, setStart] = useState(1),
    [end, setEnd] = useState(1),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [text, setText] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [result, setResult] = useState<ScanText | null>(null),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border p-3">
      <label className="block text-sm">
        Photo or scanned PDF · up to 10 MB
        <input
          type="file"
          className={`${field} min-w-0 text-xs`}
          accept="image/png,image/jpeg,image/webp,.pdf"
          disabled={busy || disabled}
          onChange={(e) => {
            onInvalidate?.();
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setText("");
            setReviewed(false);
            setError("");
          }}
        />
      </label>
      <label className="block text-sm">
        Scan language
        <select
          className={field}
          disabled={busy}
          value={language}
          onChange={(e) => {
            onInvalidate?.();
            setLanguage(e.target.value as typeof language);
          }}
        >
          <option value="eng">English</option>
          <option value="eng+ben">বাংলা + English</option>
        </select>
      </label>
      {file?.name.toLowerCase().endsWith(".pdf") && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            First page
            <input
              className={field}
              type="number"
              min={1}
              value={start}
              disabled={busy}
              onChange={(e) => {
                onInvalidate?.();
                setStart(Number(e.target.value));
              }}
            />
          </label>
          <label className="text-sm">
            Last page
            <input
              className={field}
              type="number"
              min={start}
              max={start + 4}
              value={end}
              disabled={busy}
              onChange={(e) => {
                onInvalidate?.();
                setEnd(Number(e.target.value));
              }}
            />
          </label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Runs on this device. The OCR engine and selected language data download
        on first use; clear, upright printed pages work best. Review equations
        and answer keys manually.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={outline}
          disabled={busy || disabled || !file}
          onClick={() => {
            if (!file) return;
            onInvalidate?.();
            const run = new AbortController();
            controller.current = run;
            setBusy(true);
            setError("");
            setProgress("Loading scan reader…");
            setReviewed(false);
            void recognizeQuestionScan(file, {
              language,
              startPage: start,
              endPage: end,
              signal: run.signal,
              onProgress: (page, p) =>
                setProgress(`Reading page ${page} · ${Math.round(p * 100)}%`),
            })
              .then((data) => {
                if (!run.signal.aborted) {
                  setResult(data);
                  setText(data.text);
                }
              })
              .catch((e) => {
                if (!run.signal.aborted)
                  setError(e instanceof Error ? e.message : "Scan failed");
              })
              .finally(() => {
                if (controller.current === run) {
                  setBusy(false);
                  setProgress("");
                  controller.current = null;
                }
              });
          }}
        >
          Read scan
        </button>
        {busy && (
          <button
            type="button"
            className={outline}
            onClick={() => {
              controller.current?.abort();
              setProgress("Cancelling scan…");
            }}
          >
            Cancel scan
          </button>
        )}
      </div>
      {progress && (
        <p role="status" className="text-sm">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <>
          <p className="text-xs text-muted-foreground">
            {result.pages} page(s) read · OCR confidence{" "}
            {Math.round(result.confidence)}%. Check the original before adding
            questions.
          </p>
          <label className="block text-sm">
            Review extracted text
            <textarea
              rows={12}
              className={field}
              maxLength={2 * 1024 * 1024}
              value={text}
              onChange={(e) => {
                onInvalidate?.();
                setText(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Use A. / B. or ক. / খ. choices and an ANSWER: / উত্তর: line. Missing
            answer keys can be set in the preview editor.
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the extracted question text
          </label>
          <button
            type="button"
            className={outline}
            disabled={busy || disabled || !reviewed || !text.trim()}
            onClick={() => {
              try {
                onPreview(
                  parseQuestionText(
                    text.replace(
                      /((?:ANSWER|উত্তর|সঠিক উত্তর)\s*:[^\n]+)\n/gi,
                      "$1\n\n",
                    ),
                    "text",
                  ),
                );
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Check the question format",
                );
              }
            }}
          >
            Preview extracted questions
          </button>
        </>
      )}
    </div>
  );
}
