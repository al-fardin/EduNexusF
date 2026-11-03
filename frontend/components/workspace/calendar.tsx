"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { workspace, classPath } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
export function WorkspaceCalendar() {
  const user = useAuthStore((s) => s.user?.id);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const query = useQuery({
    queryKey: ["calendar", user, month.toISOString()],
    queryFn: () => workspace.overview(month.toISOString(), end.toISOString()),
  });
  const events = query.data?.upcoming ?? [];
  const cells = Array.from(
    {
      length:
        Math.ceil(
          (month.getDay() + new Date(end.getTime() - 1).getDate()) / 7,
        ) * 7,
    },
    (_, i) => i - month.getDay() + 1,
  );
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container">
        <header className="en-page-heading">
          <h1>Calendar</h1>
          <div className="flex items-center gap-3">
            <button
              className="en-icon-button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              className="en-icon-button"
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>
        {query.isError && (
          <p role="alert" className="text-destructive mb-4">
            {examError(query.error)}
          </p>
        )}
        <div className="en-calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="en-calendar-weekday" key={d}>
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              className={`en-calendar-day${day < 1 || day > days ? " en-outside-day" : ""}`}
              key={i}
            >
              {day >= 1 && day <= days && (
                <>
                  <span>{day}</span>
                  {events
                    .filter((e) => new Date(e.at).getDate() === day)
                    .map((e) => (
                      <Link
                        key={`${e.kind}-${e.id}`}
                        href={`${classPath(e.classroom_id, e.role)}?tab=${e.kind === "exam" ? "exam" : "classwork"}`}
                      >
                        <b>{e.kind === "exam" ? "Exam" : "Due"}</b> {e.title}
                      </Link>
                    ))}
                </>
              )}
            </div>
          ))}
        </div>
        <section className="en-home-panel mt-5">
          <h2 className="font-semibold mb-3">This month</h2>
          {query.isPending ? (
            <p className="en-panel-empty">Loading calendar…</p>
          ) : events.length === 0 ? (
            <p className="en-panel-empty">
              No scheduled exams or assignment deadlines.
            </p>
          ) : (
            events.map((e) => (
              <Link
                className="en-calendar-event"
                key={`${e.kind}-${e.id}`}
                href={`${classPath(e.classroom_id, e.role)}?tab=${e.kind === "exam" ? "exam" : "classwork"}`}
              >
                <time>
                  {new Date(e.at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
                <strong>{e.title}</strong>
                <span>{e.classroom_name}</span>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
