"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { academic, type CalendarItem } from "@/services/academic-tools";
import { workspace } from "@/services/workspace";
import { resourceLink } from "@/lib/academic-tools";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  EmptyState,
  ErrorState,
  ConfirmAction,
} from "@/components/ui/app-feedback";
import { CalendarEventForm } from "./calendar-event-form";
import { examError } from "@/services/exams";
export function WorkspaceCalendar() {
  const { t, locale } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [classId, setClassId] = useState(""),
    [kind, setKind] = useState("all"),
    [adding, setAdding] = useState(false),
    [removing, setRemoving] = useState<CalendarItem | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const query = useQuery({
    queryKey: ["academic-calendar", user, month.toISOString()],
    queryFn: () => academic.calendar(month.toISOString(), end.toISOString()),
    enabled: !!user,
  });
  const classes = useQuery({
    queryKey: ["workspace", user],
    queryFn: () => workspace.overview(),
    enabled: !!user,
  });
  const events = (query.data?.items ?? []).filter(
    (e) =>
      (!classId || e.classroom_id === classId) &&
      (kind === "all" || e.kind === kind),
  );
  const teachers = (classes.data?.classes ?? []).filter(
    (c) => c.role === "teacher",
  );
  const days = new Date(end.getTime() - 1).getDate();
  const cells = Array.from(
    { length: Math.ceil((month.getDay() + days) / 7) * 7 },
    (_, i) => i - month.getDay() + 1,
  );
  async function action(id: string, run: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await run();
      await client.invalidateQueries({ queryKey: ["academic-calendar"] });
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("Calendar")}</h1>
          {teachers.length > 0 && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" />
              {t("New event")}
            </Button>
          )}
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("Previous month")}
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft />
            </Button>
            <h2 className="text-lg font-semibold">
              {month.toLocaleDateString(locale, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("Next month")}
              onClick={() => setMonth(end)}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setMonth(
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                )
              }
            >
              {t("Today")}
            </Button>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <select
              aria-label={t("Class")}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="max-w-full rounded-xl border border-border bg-card p-2 text-sm"
            >
              <option value="">{t("All classes")}</option>
              {classes.data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Type")}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded-xl border border-border bg-card p-2 text-sm"
            >
              {["all", "exam", "assignment", "event"].map((k) => (
                <option key={k} value={k}>
                  {t(
                    k === "all" ? "All types" : k[0].toUpperCase() + k.slice(1),
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(error || query.isError) && (
          <ErrorState message={error || examError(query.error)} />
        )}
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
        {query.isPending ? (
          <ContentSkeleton rows={4} />
        ) : (
          <>
            <div className="en-calendar-grid" aria-label={t("This month")}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="en-calendar-weekday">
                  {t(d)}
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
                            key={e.kind + e.id}
                            href={`#calendar-${e.kind}-${e.id}`}
                            aria-label={`${e.title} · ${e.classroom_name}`}
                          >
                            {e.title}
                          </Link>
                        ))}
                    </>
                  )}
                </div>
              ))}
            </div>
            {query.data?.truncated && (
              <p role="status">
                {t("Results are limited; narrow your date range.")}
              </p>
            )}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("This month")}</h2>
              {!events.length ? (
                <EmptyState title={t("No upcoming events")} />
              ) : (
                events.map((e) => (
                  <article
                    id={`calendar-${e.kind}-${e.id}`}
                    key={e.kind + e.id}
                    className="scroll-mt-24 space-y-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {e.classroom_name} ·{" "}
                          {t(e.kind[0].toUpperCase() + e.kind.slice(1))}
                        </p>
                        <h3 className="mt-1 font-semibold">
                          <Link href={resourceLink(e)}>{e.title}</Link>
                        </h3>
                        <time className="text-sm text-muted-foreground">
                          {new Date(e.at).toLocaleString(locale)}
                        </time>
                        {e.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm">
                            {e.description}
                          </p>
                        )}
                      </div>
                      {e.kind === "event" && e.role === "teacher" && (
                        <Button variant="ghost" onClick={() => setRemoving(e)}>
                          {t("Delete event")}
                        </Button>
                      )}
                    </div>
                    {new Date(e.at) > new Date() && (
                      <label className="flex flex-wrap items-center gap-2 text-sm">
                        {t("Reminder")}
                        <select
                          className="rounded-xl border border-border bg-background p-2"
                          aria-label={`${t("Reminder")}: ${e.title}`}
                          value={e.lead_minutes}
                          disabled={!!busy || e.reminder_sent}
                          onChange={(event) =>
                            void action(e.id, async () => {
                              await academic.reminder(
                                e,
                                Number(event.target.value),
                              );
                              setStatus(t("Reminder saved"));
                            })
                          }
                        >
                          {[
                            [0, "Off"],
                            [15, "15 minutes before"],
                            [60, "1 hour before"],
                            [1440, "1 day before"],
                          ].map(([v, label]) => (
                            <option key={v} value={v}>
                              {t(String(label))}
                            </option>
                          ))}
                        </select>
                        {e.reminder_sent && <span>{t("Reminder sent")}</span>}
                      </label>
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}
        <CalendarEventForm
          open={adding}
          onOpenChange={setAdding}
          classes={teachers}
          onSaved={() => {
            void client.invalidateQueries({ queryKey: ["academic-calendar"] });
            setStatus(t("Event created"));
          }}
        />
        <ConfirmAction
          open={!!removing}
          onOpenChange={(v) => {
            if (!v) setRemoving(null);
          }}
          title={t("Remove this event?")}
          description={removing?.title ?? ""}
          busy={!!busy}
          onConfirm={() => {
            if (removing)
              void action(removing.id, async () => {
                await academic.deleteEvent(removing);
                setRemoving(null);
              });
          }}
        />
      </div>
    </main>
  );
}
