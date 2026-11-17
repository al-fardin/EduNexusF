"use client";
import { BulkSection } from "./bulk-section";
import { PersonalTiming } from "./personal-timing";
import { TrashContents } from "@/components/workspace/trash";
import { useState, useRef } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  sections,
  type Section,
  type RosterStudent,
  type RosterPreview,
} from "@/services/sections";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  ConfirmAction,
} from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
const field =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background p-3 text-sm";
export function SectionSettings({
  classId,
  open,
  onOpenChange,
}: {
  classId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = usePreferences(),
    [tab, setTab] = useState("sections");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("Advanced class settings")}</DialogTitle>
          <DialogDescription>
            {t(
              "Optional tools. Your class works normally without sections or filters.",
            )}
          </DialogDescription>
        </DialogHeader>
        <nav
          className="flex flex-wrap gap-2"
          aria-label={t("Advanced class settings")}
        >
          {[
            ["sections", "Sections"],
            ["roster", "Student sections"],
            ["bulk", "Bulk section transfer"],
            ["timing", "Personal timing"],
            ["trash", "Class trash"],
            ["import", "CSV roster import"],
            ["preview", "Student-view preview"],
          ].map(([id, label]) => (
            <Button
              key={id}
              variant={tab === id ? "default" : "outline"}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {t(label)}
            </Button>
          ))}
        </nav>
        {open &&
          (tab === "sections" ? (
            <ManageSections classId={classId} />
          ) : tab === "roster" ? (
            <SectionRoster classId={classId} />
          ) : tab === "bulk" ? (
            <BulkSection classId={classId} />
          ) : tab === "timing" ? (
            <PersonalTiming classId={classId} />
          ) : tab === "trash" ? (
            <TrashContents classId={classId} />
          ) : tab === "import" ? (
            <ImportRoster classId={classId} />
          ) : (
            <StudentPreview classId={classId} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
function useSections(classId: string) {
  const user = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["class-sections", user, classId],
    queryFn: () => sections.list(classId),
  });
}
function ManageSections({ classId }: { classId: string }) {
  const { t } = usePreferences(),
    query = useSections(classId),
    client = useQueryClient(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<Section | null>(null),
    [name, setName] = useState("");
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await client.invalidateQueries({ queryKey: ["class-sections"] });
      setName("");
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
      setRemove(null);
    }
  }
  return (
    <section className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(() => sections.create(classId, name));
        }}
      >
        <label className="grid min-w-0 flex-1 gap-1 text-sm">
          {t("Section name")}
          <input
            required
            maxLength={60}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <Button type="submit" disabled={busy || !name.trim()}>
          {t("Create section")}
        </Button>
      </form>
      {error && <ErrorState message={error} />}
      {query.isPending ? (
        <ContentSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState message={examError(query.error)} />
      ) : !query.data.length ? (
        <EmptyState title={t("No sections. Add one only if needed.")} />
      ) : (
        query.data.map((s) => (
          <form
            key={s.id + ":" + s.version}
            className="space-y-2 rounded-xl border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("name"));
              void perform(() => sections.rename(classId, s, value));
            }}
          >
            <label className="grid gap-1 text-sm">
              {t("Section name")}
              <input
                name="name"
                required
                maxLength={60}
                defaultValue={s.name}
                disabled={busy}
                className={field}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {t("Students")}: {s.students}
            </p>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={busy}>
                {t("Rename")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setRemove(s)}
              >
                {t("Delete")}
              </Button>
            </div>
          </form>
        ))
      )}
      <ConfirmAction
        open={!!remove}
        onOpenChange={(v) => {
          if (!busy && !v) setRemove(null);
        }}
        title={t("Delete section?")}
        description={remove?.name ?? ""}
        busy={busy}
        onConfirm={() => {
          if (remove) void perform(() => sections.remove(classId, remove));
        }}
      />
    </section>
  );
}
function SectionRoster({ classId }: { classId: string }) {
  const { t } = usePreferences(),
    [search, setSearch] = useState(""),
    user = useAuthStore((s) => s.user?.id),
    choices = useSections(classId);
  const query = useInfiniteQuery({
    queryKey: ["section-roster", user, classId, search],
    queryFn: ({ pageParam }) => sections.roster(classId, search, pageParam),
    initialPageParam: 0,
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
  });
  return (
    <section className="space-y-3">
      <label className="grid gap-1 text-sm">
        {t("Search students")}
        <input
          type="search"
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={field}
        />
      </label>
      {query.isPending || choices.isPending ? (
        <ContentSkeleton rows={3} />
      ) : query.isError || choices.isError ? (
        <ErrorState message={examError(query.error || choices.error)} />
      ) : (
        <>
          {query.data.pages
            .flatMap((p) => p.items)
            .map((r) => (
              <RosterRow
                key={r.id + ":" + r.version}
                classId={classId}
                item={r}
                options={choices.data}
              />
            ))}
          {!query.data.pages[0].items.length && (
            <EmptyState title={t("No students found")} />
          )}
        </>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("More students")}
        </Button>
      )}
    </section>
  );
}
function RosterRow({
  classId,
  item,
  options,
}: {
  classId: string;
  item: RosterStudent;
  options: Section[];
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [value, setValue] = useState(item.section_id),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-2 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void sections
          .assign(classId, item, value, reason)
          .then(() =>
            Promise.all(
              [
                ["section-roster"],
                ["class-sections"],
                ["class-progress"],
                ["gradebook"],
                ["audience-preview"],
              ].map((queryKey) => client.invalidateQueries({ queryKey })),
            ),
          )
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <p className="break-words font-medium">
        {item.name} · {item.roll || t("No roll")}
      </p>
      <p className="break-all text-xs text-muted-foreground">{item.email}</p>
      <label className="grid gap-1 text-sm">
        {t("Section")}
        <select
          disabled={busy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={field}
        >
          <option value="">{t("Unassigned")}</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {t("Reason for roster change")}
        <input
          required
          minLength={3}
          maxLength={1000}
          disabled={busy}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={field}
        />
      </label>
      <Button
        type="submit"
        variant="outline"
        disabled={busy || value === item.section_id}
      >
        {t("Save section")}
      </Button>
      {error && <ErrorState message={error} />}
    </form>
  );
}
function ImportRoster({ classId }: { classId: string }) {
  const readVersion = useRef(0);
  const { t } = usePreferences(),
    client = useQueryClient(),
    [csv, setCSV] = useState(""),
    [reason, setReason] = useState(""),
    [preview, setPreview] = useState<RosterPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState<number | null>(null);
  async function run(action: "preview" | "commit") {
    setBusy(true);
    setError("");
    setDone(null);
    try {
      const p = await sections.import(
        classId,
        csv,
        action,
        preview?.revision,
        reason,
      );
      if (action === "preview") setPreview(p);
      else {
        setPreview(null);
        setCSV("");
        setDone(p.changed);
        await Promise.all(
          [
            ["section-roster"],
            ["class-sections"],
            ["audience-preview"],
            ["class-progress"],
            ["gradebook"],
          ].map((queryKey) => client.invalidateQueries({ queryKey })),
        );
      }
    } catch (e) {
      setError(examError(e));
      if (action === "commit") setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t(
          "Update enrolled students only. Invite other students through Class enrollment first. Blank section clears a section; existing rolls with participation are protected.",
        )}
      </p>
      <a
        className="inline-block min-h-11 text-sm text-primary underline"
        href="data:text/csv;charset=utf-8,name%2Cemail%2Croll%2Csection%0ARafi%2Cstudent%40example.com%2C001%2CA%0A"
        download="class-roster.csv"
      >
        {t("Download CSV template")}
      </a>
      <label className="grid gap-1 text-sm">
        {t("CSV file")}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          className="min-h-11 w-full min-w-0 text-sm"
          onChange={(e) => {
            const read = ++readVersion.current;
            const file = e.target.files?.[0];
            setPreview(null);
            setCSV("");
            if (!file) return;
            if (file.size > 100000) {
              setError(t("CSV must be at most 100 KB"));
              return;
            }
            void file
              .text()
              .then((value) => {
                if (read === readVersion.current) setCSV(value);
              })
              .catch(() => setError(t("Unable to read file")));
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t("CSV contents")}
        <textarea
          rows={6}
          maxLength={100000}
          disabled={busy}
          value={csv}
          onChange={(e) => {
            readVersion.current++;
            setCSV(e.target.value);
            setPreview(null);
          }}
          className={field}
        />
      </label>
      <Button
        disabled={busy || !csv.trim()}
        onClick={() => void run("preview")}
      >
        {t("Preview roster changes")}
      </Button>
      {preview && (
        <>
          <p role="status" className="text-sm">
            {t("Ready")}: {preview.ready}
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {preview.rows.map((r) => (
              <li
                key={r.line}
                className="rounded-lg bg-secondary p-2 text-sm [overflow-wrap:anywhere]"
              >
                {r.line}. {r.name} · {r.email} · {r.roll} ·{" "}
                {r.section || t("Unassigned")}
                <span className="block text-xs text-muted-foreground">
                  {t(r.state)}
                </span>
              </li>
            ))}
          </ul>
          <label className="grid gap-1 text-sm">
            {t("Reason for roster change")}
            <input
              minLength={3}
              maxLength={1000}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              className={field}
            />
          </label>
          <Button
            disabled={busy || !preview.ready || reason.trim().length < 3}
            onClick={() => void run("commit")}
          >
            {t("Confirm roster changes")} ({preview.ready})
          </Button>
        </>
      )}
      {done !== null && (
        <p role="status">
          {t("Updated students")}: {done}
        </p>
      )}
      {error && <ErrorState message={error} />}
    </section>
  );
}
function StudentPreview({ classId }: { classId: string }) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    [roll, setRoll] = useState(""),
    [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["student-view", user, classId, roll, offset],
    queryFn: () => sections.studentView(classId, roll, offset),
    enabled: !!roll,
  });
  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t(
          "Read-only visibility preview. Normal exam timing and entry rules still apply.",
        )}
      </p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setRoll(
            String(new FormData(e.currentTarget).get("roll"))
              .trim()
              .toUpperCase(),
          );
          setOffset(0);
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("Full student roll")}
          <input name="roll" required maxLength={32} className={field} />
        </label>
        <Button type="submit">{t("Preview student view")}</Button>
      </form>
      {roll &&
        (query.isPending ? (
          <ContentSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState message={examError(query.error)} />
        ) : (
          <>
            <p className="text-sm font-medium">
              {query.data.student.name} · {query.data.student.roll} ·{" "}
              {query.data.student.section || t("Unassigned")}
            </p>
            {query.data.items.map((item) => (
              <article
                key={item.kind + item.id}
                className="space-y-1 rounded-xl border border-border p-3"
              >
                <h3 className="break-words font-medium">{item.title}</h3>
                <p className="text-sm">
                  {t(
                    (
                      {
                        exam: "Exam",
                        assignment: "Assignment",
                        material: "Material",
                        post: "Announcement",
                      } as Record<string, string>
                    )[item.kind] ?? item.kind,
                  )}{" "}
                  · {t(item.visible ? "Visible" : "Hidden")} · {t(item.reason)}
                </p>
              </article>
            ))}
            <nav className="flex justify-between">
              {offset > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  {t("Previous")}
                </Button>
              ) : (
                <span />
              )}
              {query.data.next_offset >= 0 && (
                <Button
                  variant="outline"
                  onClick={() => setOffset(query.data.next_offset)}
                >
                  {t("More")}
                </Button>
              )}
            </nav>
          </>
        ))}
    </section>
  );
}
