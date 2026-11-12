"use client";
import {Localized} from "@/components/ui/localized";
import Link from "next/link";
import {usePreferences} from "@/providers/preferences-provider";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Plus,
} from "lucide-react";
import { ClassroomCard } from "@/components/classroom/classroom-card";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { workspace, classPath } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
export function WorkspaceHome({
  classesOnly = false,
}: {
  classesOnly?: boolean;
}) {
  const {t}=usePreferences();
  const user = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState("all");
  const query = useQuery({
    queryKey: ["workspace", user],
    queryFn: () => workspace.overview(),
  });
  const classes = (query.data?.classes ?? []).filter(
    (c) => filter === "all" || c.role === filter,
  );
  return (
    <main className="en-workspace-page en-violet-home">
      <div className="en-workspace-container">
        <header className="en-page-heading">
          <h1>{t(classesOnly ? "Classroom" : "Home")}</h1>
          <div className="flex gap-3">
            <Link className="en-outline-button" href="/student/classrooms/join">
              {t("Join class")}
            </Link>
            <Link
              className="en-solid-button"
              href="/instructor/classrooms/create"
            >
              <Plus size={18} />
              {t("Create class")}
            </Link>
          </div>
        </header>
        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Workspace tools"><Link className="en-outline-button" href="/tasks">{t("Task inbox")}</Link><Link className="en-outline-button" href="/storage">{t("Storage")}</Link><Link className="en-outline-button" href="/semesters">{t("Semesters")}</Link><Link className="en-outline-button" href="/calendar">{t("Calendar")}</Link><Link className="en-outline-button" href="/progress">{t("Progress")}</Link><Link className="en-outline-button" href="/search">{t("Search")}</Link></nav>
        <div className="en-home-filters" aria-label="Filter classes">
          {[
            ["all", "All"],
            ["teacher", "Teaching"],
            ["student", "Learning"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {query.isPending ? (
          <ContentSkeleton rows={2} />
        ) : query.isError ? (
          <div className="en-workspace-empty" role="alert">
            <p>{examError(query.error)}</p>
            <button
              className="en-outline-button mt-4"
              onClick={() => void query.refetch()}
            ><Localized>Retry</Localized></button>
          </div>
        ) : classes.length ? (
          <div className="en-workspace-class-grid">
            {classes.map((c) => (
              <ClassroomCard key={c.id} classroom={c} kind={c.role} />
            ))}
          </div>
        ) : (
          <div className="en-workspace-empty">
            <h2>No classes yet</h2>
            <p>Create a class or join with your teacher’s code.</p>
          </div>
        )}
        {!classesOnly && query.data && (
          <div className="en-home-panels">
            <section className="en-home-panel">
              <div className="en-panel-heading">
                <h2><Localized>Recent activity</Localized></h2>
              </div>
              {query.data.activity.length === 0 ? (
                <p className="en-panel-empty">
                  Class updates will appear here.
                </p>
              ) : (
                <div className="en-activity-list">
                  {query.data.activity.map((item) => (
                    <Link
                      key={item.id}
                      href={`${classPath(item.classroom_id, item.role)}?tab=stream`}
                    >
                      <span className="en-activity-icon">
                        <FileText size={19} />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {item.classroom_name} · {item.author_name}
                        </p>
                      </div>
                      <time dateTime={item.at}>
                        {new Date(item.at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="en-home-panel">
              <div className="en-panel-heading">
                <h2><Localized>Upcoming</Localized></h2>
                <Link href="/calendar"><Localized>View all</Localized><ArrowRight size={15} />
                </Link>
              </div>
              {query.data.upcoming.length === 0 ? (
                <p className="en-panel-empty">
                  No upcoming exams or assignments.
                </p>
              ) : (
                query.data.upcoming.slice(0, 4).map((item) => (
                  <Link
                    className="en-upcoming-item"
                    key={`${item.kind}-${item.id}`}
                    href={`${classPath(item.classroom_id, item.role)}?tab=${item.kind === "exam" ? "exam" : "classwork"}`}
                  >
                    <span className="en-activity-icon">
                      {item.kind === "exam" ? (
                        <CalendarDays size={19} />
                      ) : (
                        <ClipboardCheck size={19} />
                      )}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.classroom_name}</p>
                      <time dateTime={item.at}>
                        {new Date(item.at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <ArrowRight size={17} />
                  </Link>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
