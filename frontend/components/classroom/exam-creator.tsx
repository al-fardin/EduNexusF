"use client";
import { ExamDraftPreview } from "./exam-preview";

import { MobileExamOption } from "@/components/classroom/mobile-exam-option";

import {
  QuestionBank,
  SaveBankQuestion,
} from "@/components/classroom/question-bank";
import { QuestionTesterUpload } from "@/components/classroom/question-tester-upload";

import { useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
  examError,
  examService,
  type ExamQuestion,
  type NewExam,
  type QuestionKind,
} from "@/services/exams";

import {
  field,
  primary,
  outline,
  panel,
  localDate,
  newQuestion,
} from "./exam-presentation";

export function ExamCreator({
  classroomId,
  onClose,
}: {
  classroomId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starts, setStarts] = useState(() =>
    localDate(new Date(Date.now() + 5 * 60000)),
  );
  const [ends, setEnds] = useState(() =>
    localDate(new Date(Date.now() + 125 * 60000)),
  );
  const [duration, setDuration] = useState(60);
  const [allowPhone, setAllowPhone] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [questions, setQuestions] = useState<ExamQuestion[]>([newQuestion()]);
  const mutation = useMutation({
    mutationFn: (payload: NewExam) => examService.create(classroomId, payload),
    onSuccess: onClose,
  });
  function updateQuestion(index: number, patch: Partial<ExamQuestion>) {
    setQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }
  function create() {
    const payload: NewExam = {
      allow_mobile_mcq: allowPhone && questions.every((q) => q.kind === "mcq"),
      title: title.trim(),
      description: description.trim(),
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      duration_minutes: duration,
      questions: questions.map((q) =>
        q.kind === "mcq"
          ? {
              ...q,
              options: q.options?.map((o) => o.trim()),
              sample_answer: "",
            }
          : { ...q, options: [], correct_option: undefined },
      ),
    };
    mutation.mutate(payload);
  }
  return (
    <section className={panel}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <ExamDraftPreview
          title={title}
          duration={duration}
          questions={questions}
        />
      </div>
      <h3 className="mb-4 text-lg font-bold">
        Build an exam{" "}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          Private draft
        </span>
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Exam title
          <input
            className={field}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Midterm practical"
          />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Duration (minutes)
          <input
            className={field}
            type="number"
            min={1}
            max={240}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Start (local time)
          <input
            className={field}
            type="datetime-local"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          End (local time)
          <input
            className={field}
            type="datetime-local"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
          />
        </label>
      </div>
      <label className="mt-4 block space-y-2 text-sm font-semibold">
        Instructions
        <textarea
          className={field}
          value={description}
          rows={2}
          maxLength={5000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Allowed tools, exam rules, grading…"
        />
      </label>
      <MobileExamOption
        enabled={allowPhone}
        onChange={setAllowPhone}
        mcqOnly={questions.every((q) => q.kind === "mcq")}
      />
      <QuestionBank
        classroomId={classroomId}
        onAdd={(items) =>
          setQuestions((current) => {
            const existing = current.filter(
              (q) =>
                q.prompt.trim() ||
                q.options?.some((o) => o.trim()) ||
                q.sample_answer?.trim() ||
                q.tester,
            );
            if (existing.length + items.length > 40) {
              window.alert("Maximum 40 questions per exam");
              return current;
            }
            return [...existing, ...items];
          })
        }
      />
      <div className="mt-6 flex items-center justify-between gap-2">
        <h4 className="font-bold">Questions ({questions.length}/40)</h4>
        <button
          type="button"
          className={outline}
          disabled={questions.length >= 40}
          onClick={() => setQuestions((q) => [...q, newQuestion()])}
        >
          <Plus size={16} /> Add question
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <section
            key={q.id}
            className="rounded-[22px_10px_20px_12px] border border-border bg-background p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <strong>Question {i + 1}</strong>
              <button
                type="button"
                className="text-xs font-semibold text-destructive"
                disabled={questions.length === 1}
                onClick={() =>
                  setQuestions((current) => current.filter((_, n) => i !== n))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                Type
                <select
                  className={field}
                  value={q.kind}
                  onChange={(e) => {
                    const kind = e.target.value as QuestionKind;
                    updateQuestion(i, {
                      kind,
                      tester: kind === "coding" ? q.tester : undefined,
                      options: kind === "mcq" ? ["", ""] : [],
                      correct_option: kind === "mcq" ? 0 : undefined,
                    });
                  }}
                >
                  <option value="mcq">MCQ</option>
                  <option value="theory">Theory</option>
                  <option value="coding">Coding</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Points
                <input
                  className={field}
                  type="number"
                  min={1}
                  max={100}
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion(i, { points: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label className="mt-3 block space-y-1 text-sm">
              Question / problem statement
              <textarea
                className={field}
                rows={3}
                maxLength={10000}
                value={q.prompt}
                onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
              />
            </label>
            <label className="mt-3 block text-sm">
              Answer explanation
              <textarea
                maxLength={4000}
                rows={2}
                className={field}
                value={q.explanation ?? ""}
                onChange={(e) =>
                  updateQuestion(i, { explanation: e.target.value })
                }
                placeholder="Explain the expected answer. Students see this only when answer review is released."
              />
            </label>
            {q.kind === "mcq" ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select the correct answer.
                </p>
                {q.options?.map((option, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      aria-label={`Correct option ${j + 1}`}
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correct_option === j}
                      onChange={() => updateQuestion(i, { correct_option: j })}
                    />
                    <input
                      aria-label={`Option ${j + 1}`}
                      className={field}
                      value={option}
                      onChange={(e) =>
                        updateQuestion(i, {
                          options: q.options?.map((o, k) =>
                            k === j ? e.target.value : o,
                          ),
                        })
                      }
                    />
                    {(q.options?.length ?? 0) > 2 && (
                      <button
                        type="button"
                        className="text-destructive"
                        onClick={() =>
                          updateQuestion(i, {
                            options: q.options?.filter((_, k) => k !== j),
                            correct_option: 0,
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={outline}
                  disabled={(q.options?.length ?? 0) >= 6}
                  onClick={() =>
                    updateQuestion(i, { options: [...(q.options ?? []), ""] })
                  }
                >
                  Add option
                </button>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                <label className="space-y-1 text-sm">
                  Reference solution / marking notes (teacher only)
                  <textarea
                    className={field}
                    rows={3}
                    value={q.sample_answer ?? ""}
                    maxLength={15000}
                    onChange={(e) =>
                      updateQuestion(i, { sample_answer: e.target.value })
                    }
                  />
                </label>
                {q.kind === "coding" && (
                  <label className="space-y-1 text-sm">
                    Expected language
                    <select
                      className={field}
                      value={q.language || "python"}
                      onChange={(e) =>
                        updateQuestion(i, { language: e.target.value })
                      }
                    >
                      <option value="python">Python</option>
                      <option value="go">Go</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                      <option value="c">C</option>
                      <option value="typescript">TypeScript</option>
                      <option value="rust">Rust</option>
                      <option value="ruby">Ruby</option>
                      <option value="php">PHP</option>
                      <option value="other">Other (no compiler)</option>
                    </select>
                  </label>
                )}
              </div>
            )}
            <SaveBankQuestion classroomId={classroomId} question={q} />
            {q.kind === "coding" && (
              <QuestionTesterUpload
                classroomId={classroomId}
                tester={q.tester}
                disabled={mutation.isPending || uploads > 0}
                onBusyChange={(delta) => setUploads((n) => n + delta)}
                onChange={(tester) =>
                  setQuestions((list) =>
                    list.map((item) =>
                      item.id === q.id && item.kind === "coding"
                        ? { ...item, tester }
                        : item,
                    ),
                  )
                }
              />
            )}
          </section>
        ))}
      </div>
      {mutation.isError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {examError(mutation.error)}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={primary}
          disabled={mutation.isPending || uploads > 0}
          onClick={() => {
            if (!title.trim() || !starts || !ends) {
              window.alert("Provide a title, start and end time.");
              return;
            }
            create();
          }}
        >
          {mutation.isPending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}{" "}
          {mutation.isPending ? "Saving draft…" : "Save private draft"}
        </button>
        <button
          type="button"
          className={outline}
          disabled={mutation.isPending || uploads > 0}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
