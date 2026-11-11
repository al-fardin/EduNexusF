"use client";
import {Gradebook} from "@/components/classroom/gradebook";
import {ActivityHistory} from "@/components/classroom/activity-history";
import { useClassroomTab } from "@/lib/classroom-tab";
import { ClassroomHeader } from "@/components/classroom/classroom-header";
import { ExamResults } from "@/components/classroom/exam-results";
import { CourseCodeSettings } from "@/components/classroom/course-code-settings";
import { ExamManagement } from "@/components/classroom/exam-management";

import { ExamBoard } from "@/components/classroom/exam-board";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  LoaderCircle,
  Megaphone,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { StreamFeed } from "@/components/classroom/stream-feed";
import { AITutor } from "@/components/classroom/ai-tutor";
import { LearningAnalytics } from "@/components/classroom/learning-analytics";
import { ClassworkBoard } from "@/components/classroom/classwork-board";
import {
  ClassroomMember,
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

type ClassroomTab =
  | "stream"
  | "tutor"
  | "gradebook"
  | "activity"
  | "analytics"
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
    key: "results",
    label: "Results",
  },
  {
    key: "exam",
    label: "Exam",
  },
  {key:"gradebook",label:"Gradebook"},
  {key:"activity",label:"History"},
  { key: "analytics", label: "Analytics" },
  { key: "tutor", label: "AI tutor" },
];

export default function ClassroomDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const queryClient = useQueryClient();

  const classroomId = params.id ?? "";
  const [activeTab, setActiveTab] = useClassroomTab(
    tabs.map((t) => t.key),
    "stream",
  );

  const classroomQuery = useQuery({
    queryKey: ["classrooms", "mine", classroomId],

    queryFn: () => classroomService.getMine(classroomId),

    enabled: Boolean(classroomId),
  });

  const membersQuery = useQuery({
    queryKey: ["classrooms", "members", classroomId],

    queryFn: () => classroomService.listMembers(classroomId, 1, 100),

    enabled: Boolean(classroomId) && activeTab === "people",
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      classroomService.removeMember(classroomId, userId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classrooms", "members", classroomId],
      });
    },
  });

  function removeStudent(member: ClassroomMember) {
    const fullName = `${member.first_name} ${member.last_name}`.trim();

    const confirmed = window.confirm(
      `Remove ${fullName || member.email} from this class?`,
    );

    if (confirmed) {
      removeMemberMutation.mutate(member.user_id);
    }
  }

  if (classroomQuery.isPending) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
          <div className="en-workspace-container">
            <div className="h-56 animate-pulse rounded-3xl bg-accent" />

            <div className="mt-6 h-20 animate-pulse rounded-2xl bg-accent" />

            <div className="mt-6 h-80 animate-pulse rounded-3xl bg-accent" />
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (classroomQuery.isError || !classroomQuery.data) {
    return (
      <AuthGuard>
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-lg rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
            <ShieldAlert size={42} className="mx-auto text-destructive" />

            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Classroom unavailable
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {getClassroomErrorMessage(classroomQuery.error)}
            </p>

            <Link
              href="/instructor/classrooms"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <ArrowLeft size={18} />
              Teaching classes
            </Link>
          </div>
        </main>
      </AuthGuard>
    );
  }

  const classroom = classroomQuery.data;

  return (
    <AuthGuard>
      <main className="en-workspace-page en-classroom-page">
        <div className="en-workspace-container">
          <ClassroomHeader classroom={classroom} kind="teacher" />

          <nav
            aria-label="Classroom sections"
            className="en-class-tabs mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm"
          >
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
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
              <StreamFeed classroomId={classroomId} canManage />
            )}

            {activeTab === "tutor" && (
              <AITutor classroomId={classroomId} canManage={true} />
            )}
            {activeTab === "gradebook" && <Gradebook classroomId={classroomId}/>}
            {activeTab === "activity" && <ActivityHistory classroomId={classroomId}/>}
            {activeTab === "analytics" && (
              <LearningAnalytics classroomId={classroomId} />
            )}
            {activeTab === "classwork" && (
              <ClassworkBoard classroomId={classroomId} canManage={true} />
            )}

            {activeTab === "people" && (
              <PeopleTab
                members={membersQuery.data?.items ?? []}
                isPending={membersQuery.isPending}
                isError={membersQuery.isError}
                error={membersQuery.error}
                removingUserId={
                  removeMemberMutation.isPending
                    ? removeMemberMutation.variables
                    : undefined
                }
                removeError={removeMemberMutation.error}
                onRetry={() => membersQuery.refetch()}
                onRemove={removeStudent}
              />
            )}

            {activeTab === "attendance" && (
              <EmptyTab
                icon={ClipboardCheck}
                title="Attendance"
                description="Instructor will take attendance and students will view their attendance records here."
              />
            )}

            {activeTab === "results" && (
              <>
                <details className="mb-4 rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Course settings
                  </summary>
                  <CourseCodeSettings classroomId={classroomId} />
                </details>
                <ExamResults classroomId={classroomId} canManage={true} />
              </>
            )}

            {activeTab === "exam" && (
              <>
                <ExamBoard classroomId={classroomId} canManage={true} />
                <details className="mt-6 rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Manage exams
                  </summary>
                  <ExamManagement classroomId={classroomId} />
                </details>
              </>
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

function EmptyTab({ icon: Icon, title, description }: EmptyTabProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary">
        <Icon size={30} />
      </div>

      <h2 className="mt-5 text-2xl font-bold">{title}</h2>

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
  onRemove: (member: ClassroomMember) => void;
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
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <p className="font-semibold text-destructive">
          Unable to load classroom members.
        </p>

        <p className="mt-2 text-sm text-destructive">
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

  const teachers = members.filter((member) => member.member_role === "teacher");

  const students = members.filter((member) => member.member_role === "student");

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
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
  onRemove: (member: ClassroomMember) => void;
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

          <h2 className="text-xl font-bold">{title}</h2>
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
            const fullName = `${member.first_name} ${member.last_name}`.trim();

            const initials =
              `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();

            const removing = removingUserId === member.user_id;

            return (
              <div
                key={member.membership_id}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {initials || "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {fullName || member.username}
                  </p>

                  <p className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>

                <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize sm:inline-flex">
                  {member.member_role}
                </span>

                {member.member_role === "student" && (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() => onRemove(member)}
                    className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removing ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}

                    <span className="hidden sm:inline">Remove</span>
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
