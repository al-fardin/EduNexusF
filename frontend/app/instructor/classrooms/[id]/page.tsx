"use client";
import { ExamResults } from "@/components/classroom/exam-results";
import { CourseCodeSettings } from "@/components/classroom/course-code-settings";
import { ExamManagement } from "@/components/classroom/exam-management";

import { ExamBoard } from "@/components/classroom/exam-board";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Code2,
  Copy,
  FileText,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Megaphone,
  School,
  ShieldAlert,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { StreamFeed } from "@/components/classroom/stream-feed";
import { MaterialLibrary } from "@/components/classroom/material-library";
import {
  ClassroomMember,
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

type ClassroomTab =
  | "stream"
  | "classwork"
  | "people"
  | "attendance"
  | "results"
  | "exam";

const tabs: {
  key: ClassroomTab;
  label: string;
}[] = [
  {
    key: "stream",
    label: "Stream",
  },
  {
    key: "classwork",
    label: "Classwork",
  },
  {
    key: "people",
    label: "People",
  },
  {
    key: "attendance",
    label: "Attendance",
  },
  {
    key: "results",
    label: "Results",
  },
  {
    key: "exam",
    label: "Exam",
  },
];

export default function ClassroomDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const queryClient = useQueryClient();

  const classroomId = params.id ?? "";

  const [activeTab, setActiveTab] =
    useState<ClassroomTab>("stream");

  const [copied, setCopied] =
    useState(false);

  const classroomQuery = useQuery({
    queryKey: [
      "classrooms",
      "mine",
      classroomId,
    ],

    queryFn: () =>
      classroomService.getMine(
        classroomId
      ),

    enabled: Boolean(classroomId),
  });

  const membersQuery = useQuery({
    queryKey: [
      "classrooms",
      "members",
      classroomId,
    ],

    queryFn: () =>
      classroomService.listMembers(
        classroomId,
        1,
        100
      ),

    enabled:
      Boolean(classroomId) &&
      activeTab === "people",
  });

  const removeMemberMutation =
    useMutation({
      mutationFn: (
        userId: string
      ) =>
        classroomService.removeMember(
          classroomId,
          userId
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "classrooms",
            "members",
            classroomId,
          ],
        });
      },
    });

  async function copyClassCode() {
    const code =
      classroomQuery.data?.class_code;

    if (!code) {
      return;
    }

    await navigator.clipboard.writeText(
      code
    );

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function removeStudent(
    member: ClassroomMember
  ) {
    const fullName =
      `${member.first_name} ${member.last_name}`.trim();

    const confirmed = window.confirm(
      `Remove ${fullName || member.email} from this class?`
    );

    if (confirmed) {
      removeMemberMutation.mutate(
        member.user_id
      );
    }
  }

  if (classroomQuery.isPending) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="h-56 animate-pulse rounded-3xl bg-accent" />

            <div className="mt-6 h-20 animate-pulse rounded-2xl bg-accent" />

            <div className="mt-6 h-80 animate-pulse rounded-3xl bg-accent" />
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (
    classroomQuery.isError ||
    !classroomQuery.data
  ) {
    return (
      <AuthGuard>
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#ffd0d0] bg-card p-8 text-center shadow-sm">
            <ShieldAlert
              size={42}
              className="mx-auto text-[#b34450]"
            />

            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Classroom unavailable
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {getClassroomErrorMessage(
                classroomQuery.error
              )}
            </p>

            <Link
              href="/instructor/classrooms"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft size={18} />
              Teaching classes
            </Link>
          </div>
        </main>
      </AuthGuard>
    );
  }

  const classroom =
    classroomQuery.data;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/instructor/classrooms"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={18} />
            Teaching classes
          </Link>

          <section className="overflow-hidden rounded-3xl bg-primary text-white shadow-lg">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-4 inline-flex rounded-2xl bg-card/10 p-3">
                    <School size={28} />
                  </div>

                  <h1 className="max-w-3xl text-3xl font-bold sm:text-4xl">
                    {classroom.name}
                  </h1>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                    {classroom.subject && (
                      <span className="inline-flex items-center gap-2">
                        <BookOpen
                          size={17}
                        />
                        {classroom.subject}
                      </span>
                    )}

                    {classroom.section && (
                      <span>
                        {classroom.section}
                      </span>
                    )}

                    {classroom.room && (
                      <span className="inline-flex items-center gap-2">
                        <MapPin
                          size={17}
                        />
                        {classroom.room}
                      </span>
                    )}
                  </div>

                  {classroom.description && (
                    <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">
                      {
                        classroom.description
                      }
                    </p>
                  )}
                </div>

                <div className="w-full rounded-2xl bg-card p-5 text-foreground lg:w-64">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Class code
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <code className="text-2xl font-bold tracking-[0.2em]">
                      {classroom.class_code}
                    </code>

                    <button
                      type="button"
                      onClick={copyClassCode}
                      className="rounded-xl border border-border p-2.5 transition hover:bg-secondary"
                      aria-label="Copy class code"
                    >
                      <Copy size={18} />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {copied
                      ? "Class code copied."
                      : "Share this code with students."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <nav className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.key)
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <section key={activeTab} className="mt-6 en-tab-view">
           {activeTab === "stream" && (
  <StreamFeed
    classroomId={classroomId}
    canManage
  />
)}

            {activeTab === "classwork" && (
              <MaterialLibrary classroomId={classroomId} canManage={true} />
            )}

            {activeTab === "people" && (
              <PeopleTab
                members={
                  membersQuery.data
                    ?.items ?? []
                }
                isPending={
                  membersQuery.isPending
                }
                isError={
                  membersQuery.isError
                }
                error={
                  membersQuery.error
                }
                removingUserId={
                  removeMemberMutation
                    .isPending
                    ? removeMemberMutation
                        .variables
                    : undefined
                }
                removeError={
                  removeMemberMutation.error
                }
                onRetry={() =>
                  membersQuery.refetch()
                }
                onRemove={removeStudent}
              />
            )}

            {activeTab ===
              "attendance" && (
              <EmptyTab
                icon={ClipboardCheck}
                title="Attendance"
                description="Instructor will take attendance and students will view their attendance records here."
              />
            )}

            {activeTab === "results" && <><CourseCodeSettings classroomId={classroomId} /><ExamResults classroomId={classroomId} canManage={true} /></>}

            {activeTab === "exam" && (
              <><ExamBoard classroomId={classroomId} canManage={true} />
<ExamManagement classroomId={classroomId} /></>
            )}
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

type EmptyTabProps = {
  icon: typeof Megaphone;
  title: string;
  description: string;
};

function EmptyTab({
  icon: Icon,
  title,
  description,
}: EmptyTabProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary">
        <Icon size={30} />
      </div>

      <h2 className="mt-5 text-2xl font-bold">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

type PeopleTabProps = {
  members: ClassroomMember[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  removingUserId?: string;
  removeError: unknown;
  onRetry: () => void;
  onRemove: (
    member: ClassroomMember
  ) => void;
};
function PeopleTab({
  members,
  isPending,
  isError,
  error,
  removingUserId,
  removeError,
  onRetry,
  onRemove,
}: PeopleTabProps) {
  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-[#ffd0d0] bg-[#fff0ef] p-8 text-center">
        <p className="font-semibold text-red-800">
          Unable to load classroom members.
        </p>

        <p className="mt-2 text-sm text-[#b34450]">
          {getClassroomErrorMessage(error)}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const teachers = members.filter(
    (member) => member.member_role === "teacher"
  );

  const students = members.filter(
    (member) => member.member_role === "student"
  );

  return (
    <div className="space-y-6">
      <PeopleSection
        title="Teachers"
        count={teachers.length}
        members={teachers}
        removingUserId={removingUserId}
        onRemove={onRemove}
      />

      <PeopleSection
        title="Students"
        count={students.length}
        members={students}
        removingUserId={removingUserId}
        onRemove={onRemove}
      />

      {removeError != null && (
        <div className="rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
          {getClassroomErrorMessage(removeError)}
        </div>
      )}
    </div>
  );
}
type PeopleSectionProps = {
  title: string;
  count: number;
  members: ClassroomMember[];
  removingUserId?: string;
  onRemove: (
    member: ClassroomMember
  ) => void;
};

function PeopleSection({
  title,
  count,
  members,
  removingUserId,
  onRemove,
}: PeopleSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <Users size={22} />

          <h2 className="text-xl font-bold">
            {title}
          </h2>
        </div>

        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
          {count}
        </span>
      </div>

      {members.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} found.
        </p>
      ) : (
        <div className="divide-y divide-slate-200">
          {members.map((member) => {
            const fullName =
              `${member.first_name} ${member.last_name}`.trim();

            const initials =
              `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();

            const removing =
              removingUserId ===
              member.user_id;

            return (
              <div
                key={
                  member.membership_id
                }
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {initials || "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {fullName ||
                      member.username}
                  </p>

                  <p className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>

                <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize sm:inline-flex">
                  {member.member_role}
                </span>

                {member.member_role ===
                  "student" && (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      onRemove(member)
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-[#ffd0d0] px-3 py-2 text-xs font-semibold text-[#b34450] transition hover:bg-[#fff0ef] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removing ? (
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}

                    <span className="hidden sm:inline">
                      Remove
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExamTab() {
  const examTypes = [
    {
      icon: ClipboardCheck,
      title: "MCQ Exam",
      description:
        "Automatic marking, question randomization and timed exams.",
    },
    {
      icon: FileText,
      title: "Theory Exam",
      description:
        "Written answers, file submission and instructor evaluation.",
    },
    {
      icon: GraduationCap,
      title: "Lab Exam",
      description:
        "Practical tasks, reports and lab-based evaluation.",
    },
    {
      icon: Code2,
      title: "Coding Exam",
      description:
        "Compiler, test cases, verdicts, time limits and memory limits.",
    },
    {
      icon: ShieldAlert,
      title: "Cheating Detection",
      description:
        "Suspicious activity, tab switching and plagiarism reports.",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Exam
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage every type
            of classroom exam.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {examTypes.map(
          ({
            icon: Icon,
            title,
            description,
          }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <Icon size={24} />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          )
        )}
      </div>
    </div>
  );
}