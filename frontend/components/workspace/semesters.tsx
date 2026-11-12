"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  academicReviews,
  type SemesterClass,
  type Term,
} from "@/services/academic-reviews";
import { classPath } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { clientId } from "@/lib/client-id";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  ConfirmAction,
} from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
const field = "rounded-xl border border-border bg-background p-3 text-sm";
export function SemesterWorkspace() {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [term, setTerm] = useState(""),
    [archived, setArchived] = useState(false),
    [create, setCreate] = useState(false),
    [editing, setEditing] = useState<SemesterClass | null>(null),
    [copying, setCopying] = useState<SemesterClass | null>(null),
    [viewing, setViewing] = useState<SemesterClass | null>(null);
  const classes = useQuery({
      queryKey: ["semester-classes", user],
      queryFn: academicReviews.classes,
      enabled: !!user,
    }),
    terms = useQuery({
      queryKey: ["academic-terms", user],
      queryFn: academicReviews.terms,
      enabled: !!user,
    });
  const items = (classes.data ?? []).filter(
    (c) =>
      (!term || c.term_id === term) &&
      (archived ? c.status === "archived" : c.status === "active"),
  );
  function changed() {
    void Promise.all([
      client.invalidateQueries({ queryKey: ["semester-classes"] }),
      client.invalidateQueries({ queryKey: ["academic-terms"] }),
      client.invalidateQueries({ queryKey: ["workspace"] }),
    ]);
  }
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t("Semesters")}</h1>
          <Button onClick={() => setCreate(true)}>{t("New semester")}</Button>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label={t("Semester")}
            className={field}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          >
            <option value="">{t("All semesters")}</option>
            {terms.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            {t("Archived classes")}
          </label>
        </div>
        {classes.isPending ? (
          <ContentSkeleton rows={3} />
        ) : classes.isError || terms.isError ? (
          <ErrorState message={examError(classes.error || terms.error)} />
        ) : !items.length ? (
          <EmptyState title={t("No classes in this view")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((c) => (
              <article
                key={c.id}
                className="space-y-3 rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {c.term_title || t("No semester")} ·{" "}
                    {t(c.status === "archived" ? "Archived" : "Active")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {c.status === "active" ? (
                      <Link href={classPath(c.id, c.role)}>{c.name}</Link>
                    ) : (
                      c.name
                    )}
                  </h2>
                  {c.subject && (
                    <p className="text-sm text-muted-foreground">{c.subject}</p>
                  )}
                </div>
                {c.syllabus && (
                  <details className="rounded-xl bg-secondary p-3 text-sm">
                    <summary>{t("Syllabus")}</summary>
                    <p className="mt-2 whitespace-pre-wrap">{c.syllabus}</p>
                  </details>
                )}
                <div className="flex flex-wrap gap-2">
                  {c.status === "archived" && (
                    <Button variant="outline" onClick={() => setViewing(c)}>
                      {t("View archive")}
                    </Button>
                  )}
                  {c.owned && (
                    <>
                      <Button variant="outline" onClick={() => setEditing(c)}>
                        {t("Manage semester")}
                      </Button>
                      <Button variant="outline" onClick={() => setCopying(c)}>
                        {t("Copy to new semester")}
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <Dialog open={create} onOpenChange={setCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("New semester")}</DialogTitle>
              <DialogDescription>{t("Semester dates")}</DialogDescription>
            </DialogHeader>
            <TermForm
              onSaved={() => {
                setCreate(false);
                changed();
              }}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!editing}
          onOpenChange={(v) => {
            if (!v) setEditing(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Manage semester")}</DialogTitle>
              <DialogDescription>{editing?.name}</DialogDescription>
            </DialogHeader>
            {editing && (
              <ClassTermForm
                key={editing.id}
                item={editing}
                terms={(terms.data ?? []).filter((s) => s.owned)}
                onSaved={() => {
                  setEditing(null);
                  changed();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!copying}
          onOpenChange={(v) => {
            if (!v) setCopying(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Copy to new semester")}</DialogTitle>
              <DialogDescription>{copying?.name}</DialogDescription>
            </DialogHeader>
            {copying && (
              <RolloverForm
                key={copying.id}
                item={copying}
                terms={(terms.data ?? []).filter((s) => s.owned)}
                onSaved={() => {
                  setCopying(null);
                  setArchived(false);
                  setTerm("");
                  changed();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!viewing}
          onOpenChange={(v) => {
            if (!v) setViewing(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing?.name}</DialogTitle>
              <DialogDescription>
                {t("Read-only archive catalogue")}
              </DialogDescription>
            </DialogHeader>
            {viewing && <ArchiveCatalogue id={viewing.id} />}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
function TermForm({ onSaved }: { onSaved: () => void }) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        void academicReviews
          .saveTerm({
            title: String(data.get("title")),
            starts_on: String(data.get("start")),
            ends_on: String(data.get("end")),
          })
          .then(onSaved)
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}
      <label className="grid gap-1 text-sm">
        {t("Title")}
        <input
          required
          name="title"
          minLength={2}
          maxLength={100}
          className={field}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["start", "Starts"],
          ["end", "Ends"],
        ].map(([name, label]) => (
          <label key={name} className="grid gap-1 text-sm">
            {t(label)}
            <input required name={name} type="date" className={field} />
          </label>
        ))}
      </div>
      <Button type="submit" disabled={busy}>
        {t("Create semester")}
      </Button>
    </form>
  );
}
function ClassTermForm({
  item,
  terms,
  onSaved,
}: {
  item: SemesterClass;
  terms: Term[];
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [term, setTerm] = useState(item.term_id),
    [syllabus, setSyllabus] = useState(item.syllabus),
    [status, setStatus] = useState(item.status),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      await academicReviews.saveClass(item.id, {
        term_id: term,
        syllabus,
        status,
      });
      onSaved();
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (status === "archived" && item.status === "active") setConfirm(true);
        else void save();
      }}
    >
      {error && <ErrorState message={error} />}
      <label className="grid gap-1 text-sm">
        {t("Semester")}
        <select
          aria-label={t("Semester")}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className={field}
        >
          <option value="">{t("No semester")}</option>
          {terms.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Syllabus")}
        <textarea
          rows={8}
          maxLength={50000}
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t("Class status")}
        <select
          aria-label={t("Class status")}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className={field}
        >
          <option value="active">{t("Active")}</option>
          <option value="archived">{t("Archived")}</option>
        </select>
      </label>
      <Button type="submit" disabled={busy}>
        {t("Save changes")}
      </Button>
      <ConfirmAction
        open={confirm}
        onOpenChange={setConfirm}
        title={t("Archive class?")}
        description={t(
          "Class data is preserved. Restore the class to resume coursework and messaging.",
        )}
        busy={busy}
        onConfirm={() => void save()}
      />
    </form>
  );
}
function RolloverForm({
  item,
  terms,
  onSaved,
}: {
  item: SemesterClass;
  terms: Term[];
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [request, setRequest] = useState(clientId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onChange={() => setRequest(clientId())}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        void academicReviews
          .rollover(item.id, {
            request_id: request,
            name: String(data.get("name")),
            term_id: String(data.get("term")),
            day_shift: Number(data.get("shift")),
            assignments: data.has("assignments"),
            exams: data.has("exams"),
            materials: data.has("materials"),
          })
          .then(onSaved)
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}
      <p className="text-sm text-muted-foreground">
        {t(
          "Coursework is copied as drafts. Student records stay in the original class.",
        )}
      </p>
      <label className="grid gap-1 text-sm">
        {t("New class name")}
        <input
          name="name"
          defaultValue={item.name + " (new semester)"}
          required
          minLength={2}
          maxLength={150}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t("Semester")}
        <select
          required
          name="term"
          aria-label={t("Semester")}
          className={field}
        >
          <option value="">{t("Choose a semester")}</option>
          {terms.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Shift coursework dates by days")}
        <input
          name="shift"
          type="number"
          min={0}
          max={730}
          defaultValue={180}
          required
          className={field}
        />
      </label>
      <fieldset disabled={busy} className="space-y-2">
        {[
          ["assignments", "Assignments"],
          ["exams", "Exams"],
          ["materials", "Materials"],
        ].map(([name, label]) => (
          <label
            className="flex min-h-11 items-center gap-3 text-sm"
            key={name}
          >
            <input name={name} type="checkbox" defaultChecked />
            {t(label)}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={busy || !terms.length}>
        {busy ? t("Copying…") : t("Create copied class")}
      </Button>
    </form>
  );
}
function ArchiveCatalogue({ id }: { id: string }) {
  const { t } = usePreferences();
  const query = useQuery({
    queryKey: ["archive-catalogue", id],
    queryFn: () => academicReviews.contents(id),
  });
  return query.isPending ? (
    <ContentSkeleton rows={3} />
  ) : query.isError ? (
    <ErrorState message={examError(query.error)} />
  ) : !query.data.length ? (
    <EmptyState title={t("No coursework")} />
  ) : (
    <div className="space-y-3">
      {query.data.map((r) => (
        <article
          key={r.kind + r.id}
          className="rounded-xl border border-border p-3"
        >
          <p className="text-xs text-muted-foreground">
            {r.kind} · {r.status}
          </p>
          <h3 className="font-medium">{r.title}</h3>
        </article>
      ))}
    </div>
  );
}
