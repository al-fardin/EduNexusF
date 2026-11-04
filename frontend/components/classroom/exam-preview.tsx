"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Clock, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { examService, examError, type ExamQuestion } from "@/services/exams";
import { examManagement } from "@/services/exam-management";
function PreviewBody({
  title,
  duration,
  questions,
}: {
  title: string;
  duration: number;
  questions: ExamQuestion[];
}) {
  const [keys, setKeys] = useState(false);
  return (
    <>
      <div className="en-exam-preview-summary">
        <strong>{title || "Untitled exam"}</strong>
        <span>
          <Clock size={15} />
          {duration} min · {questions.length} questions
        </span>
      </div>
      <label className="flex gap-2 text-sm items-center">
        <input
          type="checkbox"
          checked={keys}
          onChange={(e) => setKeys(e.target.checked)}
        />
        Show teacher answer key
      </label>
      <div className="en-exam-preview-questions">
        {questions.map((q, i) => (
          <article key={q.id}>
            <header>
              <strong>Question {i + 1}</strong>
              <span>
                {q.points} points · {q.kind}
              </span>
            </header>
            <p>{q.prompt || "Question text"}</p>
            {q.kind === "mcq" ? (
              <div className="en-exam-preview-options">
                {q.options?.map((o, index) => (
                  <label key={index}>
                    <input type="radio" name={`preview-${q.id}`} />
                    <span>{o || `Option ${index + 1}`}</span>
                    {keys && q.correct_option === index && <Check size={16} />}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                aria-label={`Preview answer for question ${i + 1}`}
                placeholder={
                  q.kind === "coding"
                    ? `Write your ${q.language || "code"} solution`
                    : "Write your answer"
                }
                rows={4}
              />
            )}{" "}
            {keys && (q.explanation || q.sample_answer) && (
              <aside>
                <strong>Answer explanation</strong>
                <p>{q.explanation || q.sample_answer}</p>
              </aside>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
export function ExamDraftPreview({
  title,
  duration,
  questions,
}: {
  title: string;
  duration: number;
  questions: ExamQuestion[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="en-outline-button"
        onClick={() => setOpen(true)}
      >
        <Eye size={16} />
        Preview
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="en-exam-preview-dialog">
          <DialogHeader>
            <DialogTitle>Exam preview</DialogTitle>
            <DialogDescription>
              Preview the question layout without starting a student attempt.
            </DialogDescription>
          </DialogHeader>
          <PreviewBody
            title={title}
            duration={duration}
            questions={questions}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
export function SavedExamPreview({
  classroomId,
  examId,
}: {
  classroomId: string;
  examId: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["teacher-exam-preview", classroomId, examId],
    queryFn: () => examService.teacherExam(classroomId, examId),
    enabled: open,
  });
  return (
    <>
      <button
        type="button"
        className="en-outline-button"
        onClick={() => setOpen(true)}
      >
        <Eye size={16} />
        Preview
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="en-exam-preview-dialog">
          <DialogHeader>
            <DialogTitle>Exam preview</DialogTitle>
            <DialogDescription>
              Teacher view. This does not create an attempt.
            </DialogDescription>
          </DialogHeader>
          {query.isPending ? (
            <p>Loading preview…</p>
          ) : query.isError ? (
            <p role="alert">{examError(query.error)}</p>
          ) : (
            <PreviewBody
              title={query.data.exam.title}
              duration={query.data.exam.duration_minutes}
              questions={query.data.questions}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function AnswerReviewSettings({
  classroomId,
  examId,
}: {
  classroomId: string;
  examId: string;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["exam-answer-review", classroomId, examId],
    queryFn: () => examManagement.reviewSettings(classroomId, examId),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="en-answer-review-settings">
      <label>
        <input
          type="checkbox"
          checked={query.data?.show_explanations ?? false}
          disabled={busy || !query.data}
          onChange={async (e) => {
            setBusy(true);
            setError("");
            try {
              await examManagement.saveReviewSettings(
                classroomId,
                examId,
                e.target.checked,
              );
              await client.invalidateQueries({
                queryKey: ["exam-answer-review", classroomId, examId],
              });
            } catch (err) {
              setError(examError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
        <span>
          Show answers and explanations with published results
          <small>Available to each student only after this exam ends.</small>
        </span>
      </label>
      {(error || query.isError) && (
        <p role="alert">{error || examError(query.error)}</p>
      )}
    </div>
  );
}
