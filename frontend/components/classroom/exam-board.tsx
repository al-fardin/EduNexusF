"use client";
import { SavedExamPreview, AnswerReviewSettings } from "./exam-preview";
import { ExamEntryGate } from "@/components/classroom/exam-entry-gate";
import { TeacherSubmissionExplorer } from "@/components/classroom/teacher-submission-explorer";
import { QuestionBank } from "@/components/classroom/question-bank";
import { clearActiveExam, rememberActiveExam } from "@/lib/exam-resume";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Send,
  ClipboardList,
  Play,
  Eye,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { examError, examService, type ExamInfo } from "@/services/exams";
import { useExamSelection } from "./use-exam-selection";
import { primary, outline, panel, dateLabel } from "./exam-presentation";
import { ExamCreator } from "./exam-creator";
import { ExamTake } from "./exam-take";

type Props = { classroomId: string; canManage: boolean };
export function ExamBoard({ classroomId, canManage }: Props) {
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { taking, entryExam, setTaking, setEntryExam, restore, restoreReady } =
    useExamSelection(classroomId, canManage);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["classrooms", classroomId, "exams"],
    queryFn: () => examService.list(classroomId),
    enabled: !taking,
  });
  const activeAttempts = useQuery({
    queryKey: ["active-exams", classroomId],
    queryFn: () => examService.active(classroomId),
    enabled: !canManage && !taking && !entryExam,
    refetchInterval: 30000,
  });
  const [notice, setNotice] = useState("");
  const restoreState =
    canManage || restoreReady
      ? "ready"
      : restore.isError && !restore.isFetching
        ? "error"
        : "checking";
  const restoreError = restore.error ? examError(restore.error) : "";
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  const publish = useMutation({
    mutationFn: (id: string) => examService.publish(classroomId, id),
    onSuccess: () => {
      setNotice(
        "Exam published. Students can join during its scheduled window.",
      );
      void client.invalidateQueries({
        queryKey: ["classrooms", classroomId, "exams"],
      });
    },
  });
  // Do not flash Stream / exam list while checking a persisted attempt.
  if (!canManage && restoreState === "checking") {
    return (
      <div className={panel} role="status">
        <LoaderCircle size={18} className="mr-2 inline animate-spin" />{" "}
        Restoring your exam session…
      </div>
    );
  }
  if (!canManage && restoreState === "error") {
    return (
      <div className={panel} role="alert">
        <h3 className="text-lg font-bold">
          Unable to verify the previous exam session
        </h3>
        <p className="mt-2 text-sm">
          {restoreError}. Your local unsynced draft has not been deleted.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            onClick={() => {
              void restore.refetch();
            }}
          >
            Retry connection
          </button>
          <button
            type="button"
            className={outline}
            onClick={() => {
              clearActiveExam(classroomId);
              setTaking(null);
              setEntryExam(null);
            }}
          >
            Back to exams
          </button>
        </div>
      </div>
    );
  }
  // Keep an active student exam as a focused view; never render the exam list underneath.
  if (entryExam && !canManage) {
    return (
      <div className="en-exam-view text-foreground">
        <ExamEntryGate
          classroomId={classroomId}
          examId={entryExam}
          onEnter={() => {
            const id = entryExam;
            rememberActiveExam(classroomId, id, "active");
            setEntryExam(null);
            setTaking(id);
          }}
          onExit={() => {
            clearActiveExam(classroomId, entryExam);
            setEntryExam(null);
          }}
        />
      </div>
    );
  }
  if (taking && !canManage) {
    return (
      <div className="en-exam-view text-foreground">
        <ExamTake
          classroomId={classroomId}
          examId={taking}
          onClose={() => {
            clearActiveExam(classroomId, taking);
            setTaking(null);
            void client.invalidateQueries({
              queryKey: ["classrooms", classroomId, "exams"],
            });
          }}
        />
      </div>
    );
  }
  return (
    <div className="space-y-5 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Exams</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            MCQ, written and coding exams.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className={primary}
            onClick={() => {
              setCreating((v) => !v);
              setNotice("");
            }}
          >
            <Plus size={17} /> {creating ? "Close editor" : "Create exam"}
          </button>
        )}
      </div>
      {!canManage &&
        activeAttempts.data?.map((attempt) => (
          <div
            key={attempt.exam_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-semibold">{attempt.title}</p>
              <p className="text-xs text-muted-foreground">
                In progress ·{" "}
                {attempt.last_saved_at
                  ? `Saved ${dateLabel(attempt.last_saved_at)}`
                  : "No server save yet"}
              </p>
            </div>
            <button
              className={primary}
              onClick={() => {
                rememberActiveExam(classroomId, attempt.exam_id, "active");
                setTaking(attempt.exam_id);
              }}
            >
              Resume exam
            </button>
          </div>
        ))}
      {notice && (
        <div
          role="status"
          className="rounded-xl bg-secondary px-4 py-3 text-sm text-primary"
        >
          {notice}
        </div>
      )}
      {canManage && !creating && <QuestionBank classroomId={classroomId} />}
      {creating && canManage && (
        <ExamCreator
          classroomId={classroomId}
          onClose={() => {
            setCreating(false);
            void client.invalidateQueries({
              queryKey: ["classrooms", classroomId, "exams"],
            });
          }}
        />
      )}

      {reviewing && canManage && (
        <TeacherReview
          classroomId={classroomId}
          examId={reviewing}
          onClose={() => setReviewing(null)}
        />
      )}
      {list.isPending && <ExamListSkeleton />}
      {list.isError && (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
        >
          {examError(list.error)}{" "}
          <button className="underline" onClick={() => void list.refetch()}>
            Retry
          </button>
        </div>
      )}
      {list.data && list.data.length === 0 && (
        <div className={panel}>
          <ClipboardList className="mb-3 text-muted-foreground" />
          <h3 className="font-bold">No exams yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage
              ? "Create your first exam; it starts as a private draft."
              : "Your teacher has not published any exams yet."}
          </p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.data?.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            canManage={canManage}
            onPublish={() => {
              if (
                window.confirm(
                  "Publish this exam for enrolled students? Questions can no longer be edited.",
                )
              )
                publish.mutate(exam.id);
            }}
            onTake={() => {
              rememberActiveExam(classroomId, exam.id, "entry");
              setEntryExam(exam.id);
              setReviewing(null);
            }}
            onReview={() => {
              setReviewing(reviewing === exam.id ? null : exam.id);
              setTaking(null);
            }}
            busy={publish.isPending && publish.variables === exam.id}
            now={now}
          />
        ))}
      </div>
      {publish.isError && (
        <p role="alert" className="text-sm text-destructive">
          {examError(publish.error)}
        </p>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Exam results appear after teacher review and publication.
      </p>
    </div>
  );
}
function ExamCard({
  exam,
  canManage,
  onPublish,
  onTake,
  onReview,
  busy,
  now,
}: {
  exam: ExamInfo;
  canManage: boolean;
  onPublish: () => void;
  onTake: () => void;
  onReview: () => void;
  busy: boolean;
  now: number;
}) {
  const open =
    exam.status === "published" &&
    now >= Date.parse(exam.starts_at) &&
    now < Date.parse(exam.ends_at);
  const waiting = now < Date.parse(exam.starts_at);
  const ended = now >= Date.parse(exam.ends_at);
  return (
    <article className={panel}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize text-foreground">
          {exam.status}
        </span>
        <span className="text-xs text-muted-foreground">
          {exam.question_count} questions
        </span>
      </div>
      <h3 className="text-lg font-bold">{exam.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {exam.description || "Classroom assessment"}
      </p>
      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>Opens: {dateLabel(exam.starts_at)}</p>
        <p>Closes: {dateLabel(exam.ends_at)}</p>
        <p>Time limit: {exam.duration_minutes} minutes after joining</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            <SavedExamPreview
              classroomId={exam.classroom_id}
              examId={exam.id}
            />
            <button type="button" className={outline} onClick={onReview}>
              <Eye size={15} /> View submissions
            </button>
            {exam.status === "draft" && (
              <button
                type="button"
                className={primary}
                onClick={onPublish}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}{" "}
                {busy ? "Publishing…" : "Publish exam"}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={primary}
            onClick={onTake}
            disabled={!open}
          >
            <Play size={15} />
            {open ? "Join / Resume" : "Exam unavailable"}
          </button>
        )}
        {!canManage && (
          <span className="text-xs text-muted-foreground">
            {ended ? "Window ended" : waiting ? "Not started" : "Open now"}
          </span>
        )}
      </div>
    </article>
  );
}

function TeacherReview({
  classroomId,
  examId,
  onClose,
}: {
  classroomId: string;
  examId: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <AnswerReviewSettings classroomId={classroomId} examId={examId} />
      <TeacherSubmissionExplorer
        classroomId={classroomId}
        examId={examId}
        onClose={onClose}
      />
    </div>
  );
}

/** Lightweight placeholders while real API requests are in flight. */
function ExamListSkeleton({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`grid gap-4 ${small ? "" : "lg:grid-cols-2"}`}
      role="status"
      aria-label="Loading exams"
    >
      {Array.from({ length: small ? 2 : 4 }, (_, i) => (
        <div key={i} className={panel}>
          <div className="en-skeleton mb-5 h-5 w-24 rounded-full" />
          <div className="en-skeleton mb-3 h-6 w-3/5 rounded-md" />
          <div className="en-skeleton mb-4 h-4 w-5/6 rounded-md" />
          <div className="en-skeleton mb-2 h-3 w-1/2 rounded-md" />
          <div className="en-skeleton mt-7 h-10 w-40 rounded-xl" />
        </div>
      ))}
      <span className="sr-only">Loading classroom examinations…</span>
    </div>
  );
}
