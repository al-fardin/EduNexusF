"use client";
import { ExamResults } from "@/components/classroom/exam-results";
import { StudentRollGate } from "@/components/classroom/student-roll-gate";

import { ExamBoard } from "@/components/classroom/exam-board";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Code2,
  FileText,
  GraduationCap,
  MapPin,

  School,
  ShieldAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { StreamFeed } from "@/components/classroom/stream-feed";
import { MaterialLibrary } from "@/components/classroom/material-library";
import {
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

type StudentClassroomTab =
  | "stream"
  | "classwork"
  | "people"
  | "attendance"
  | "results"
  | "exam";

const tabs: {
  key: StudentClassroomTab;
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

export default function StudentClassroomPage() {
  const params = useParams<{
    id: string;
  }>();

  const classroomId = params.id ?? "";

  const [activeTab, setActiveTab] =
    useState<StudentClassroomTab>(
      "stream"
    );

  const classroomQuery = useQuery({
    queryKey: [
      "classrooms",
      "joined",
      classroomId,
    ],

    queryFn: () =>
      classroomService.getJoined(
        classroomId
      ),

    enabled: Boolean(classroomId),
  });

  if (classroomQuery.isPending) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-background px-4 py-8">
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
          <div className="max-w-lg rounded-3xl border border-[#ffd0d0] bg-card p-8 text-center shadow-sm">
            <ShieldAlert
              size={42}
              className="mx-auto text-[#b34450]"
            />

            <h1 className="mt-4 text-2xl font-bold">
              Classroom unavailable
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {getClassroomErrorMessage(
                classroomQuery.error
              )}
            </p>

            <Link
              href="/student/classrooms"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft size={18} />
              My classes
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
      <StudentRollGate classroomId={classroomId}>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/student/classrooms"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={18} />
            My classes
          </Link>

          <section className="overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-lg sm:p-8">
            <div className="mb-4 inline-flex rounded-2xl bg-card/10 p-3">
              <School size={28} />
            </div>

            <h1 className="text-3xl font-bold sm:text-4xl">
              {classroom.name}
            </h1>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
              {classroom.subject && (
                <span className="inline-flex items-center gap-2">
                  <BookOpen size={17} />
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
                  <MapPin size={17} />
                  {classroom.room}
                </span>
              )}
            </div>

            {classroom.description && (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">
                {classroom.description}
              </p>
            )}
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
                      : "text-muted-foreground hover:bg-secondary"
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
    canManage={false}
  />
)}

            {activeTab === "classwork" && (
              <MaterialLibrary classroomId={classroomId} canManage={false} />
            )}

            {activeTab === "people" && (
              <EmptyTab
                icon={Users}
                title="People"
                description="Teachers and classmates of this classroom will appear here."
              />
            )}

            {activeTab ===
              "attendance" && (
              <EmptyTab
                icon={ClipboardCheck}
                title="Attendance"
                description="Your class attendance percentage and daily attendance records will appear here."
              />
            )}

            {activeTab === "results" && <ExamResults classroomId={classroomId} canManage={false} />}

            {activeTab === "exam" && (
              <ExamBoard classroomId={classroomId} canManage={false} />
            )}
          </section>
        </div>
      </main>
      </StudentRollGate>
    </AuthGuard>
  );
}

type EmptyTabProps = {
  icon: LucideIcon;
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

function StudentExamTab() {
  const examTypes: {
    icon: LucideIcon;
    title: string;
    description: string;
  }[] = [
    {
      icon: ClipboardCheck,
      title: "MCQ Exams",
      description:
        "Attend timed multiple-choice examinations.",
    },
    {
      icon: FileText,
      title: "Theory Exams",
      description:
        "Write answers and submit required files.",
    },
    {
      icon: GraduationCap,
      title: "Lab Exams",
      description:
        "Complete practical and laboratory tasks.",
    },
    {
      icon: Code2,
      title: "Coding Exams",
      description:
        "Submit code to the compiler and online judge.",
    },
    {
      icon: ShieldAlert,
      title: "Exam Monitoring",
      description:
        "Exam rules and suspicious activity monitoring will apply.",
    },
  ];

  return (
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

            <h2 className="mt-5 text-lg font-bold">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </article>
        )
      )}
    </div>
  );
}