"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { readActiveExam } from "@/lib/exam-resume";
import { useClassroomTab } from "@/lib/classroom-tab";
import { ClassroomHeader } from "@/components/classroom/classroom-header";
import { ExamResults } from "@/components/classroom/exam-results";
import { StudentRollGate } from "@/components/classroom/student-roll-gate";

import { ExamBoard } from "@/components/classroom/exam-board";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  Code2,
  FileText,
  GraduationCap,

  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { StreamFeed } from "@/components/classroom/stream-feed";
import { AITutor } from "@/components/classroom/ai-tutor";
import { LearningAnalytics } from "@/components/classroom/learning-analytics";
import { ClassworkBoard } from "@/components/classroom/classwork-board";
import {
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

type StudentClassroomTab =
  | "stream"
  | "tutor"
  | "analytics"
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
    key: "results",
    label: "Results",
  },
  {
    key: "exam",
    label: "Exam",
  },
  {key:"analytics",label:"Analytics"},
  {key:"tutor",label:"AI tutor"},
];

export default function StudentClassroomPage() {
  const params = useParams<{
    id: string;
  }>();

  const classroomId = params.id ?? "";
  const [activeTab,setActiveTab]=useClassroomTab(tabs.map(t=>t.key),"stream");
  const router=useRouter();const search=useSearchParams();const resumeUser=useAuthStore(s=>s.user?.id);
  useEffect(()=>{if(resumeUser&&!search.has("tab")&&readActiveExam(classroomId))router.replace(`/student/classrooms/${classroomId}?tab=exam`,{scroll:false})},[classroomId,resumeUser,router,search]);

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
          <div className="en-workspace-container">
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
          <div className="max-w-lg rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
            <ShieldAlert
              size={42}
              className="mx-auto text-destructive"
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
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
      <main className="en-workspace-page en-classroom-page">
        <div className="en-workspace-container">
          <ClassroomHeader classroom={classroom} kind="student"/>

          <nav aria-label="Classroom sections" className="en-class-tabs mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab===tab.key}
                  onClick={() =>
                    setActiveTab(tab.key)
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
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

            {activeTab === "tutor" && <AITutor classroomId={classroomId} canManage={false}/>}
            {activeTab === "analytics" && <LearningAnalytics classroomId={classroomId}/>}
            {activeTab === "classwork" && (
              <ClassworkBoard classroomId={classroomId} canManage={false}/>
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