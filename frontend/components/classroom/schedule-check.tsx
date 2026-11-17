"use client";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";
import { api } from "@/lib/api";
import { type AudienceRule, EVERYONE } from "@/services/audience";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
type Conflict = {
  id: string;
  classroom_id: string;
  classroom_name: string;
  kind: string;
  title: string;
  starts_at: string;
  ends_at: string;
  shared_students: number;
  warning: string;
};
type Result = { items: Conflict[]; truncated: boolean };
function date(raw?: string) {
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : "";
}
export function ScheduleCheck({
  classId,
  kind,
  start,
  end,
  due,
  resourceId = "",
  audience = EVERYONE,
  disabled = false,
}: {
  classId: string;
  kind: "exam" | "assignment";
  start?: string;
  end?: string;
  due?: string;
  resourceId?: string;
  audience?: AudienceRule;
  disabled?: boolean;
}) {
  const user = useAuthStore((s) => s.user?.id);
  const { t, locale } = usePreferences(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState(""),
    [result, setResult] = useState<Result | null>(null);
  const body = {
    kind,
    starts_at: date(start),
    ends_at: date(end),
    due_at: date(due),
    resource_id: resourceId,
    audience,
  };
  // Omit irrelevant dates: Go's time parser rejects empty RFC3339 values.
  const request =
    kind === "exam"
      ? {
          kind,
          starts_at: body.starts_at,
          ends_at: body.ends_at,
          resource_id: resourceId,
          audience,
        }
      : { kind, due_at: body.due_at, resource_id: resourceId, audience };
  const encoded = JSON.stringify([user, request]),
    valid =
      kind === "exam"
        ? !!body.starts_at && !!body.ends_at && body.ends_at > body.starts_at
        : !!body.due_at;
  async function check() {
    setBusy(true);
    setError("");
    setChecked(encoded);
    setResult(null);
    try {
      setResult(
        (await api.post(`/classrooms/${classId}/schedule-conflicts`, request))
          .data.data,
      );
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="min-w-0 space-y-3 rounded-xl border border-border p-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {t("Schedule conflict check")}
      </summary>
      <p className="text-xs text-muted-foreground">
        {t(
          "Checks published and scheduled work in classes you teach. Advisory only; publishing remains your choice.",
        )}
      </p>
      <Button
        className="min-h-11 min-w-11 whitespace-normal"
        type="button"
        variant="outline"
        disabled={!user || !valid || busy || disabled}
        onClick={() => void check()}
      >
        {t(busy ? "Checking…" : "Check schedule")}
      </Button>
      {checked === encoded &&
        (busy ? (
          <ContentSkeleton rows={2} />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          result && (
            <section
              className="space-y-3"
              aria-label={t("Schedule check results")}
            >
              <p role="status" className="text-sm">
                {t(
                  result.items.length
                    ? "Review possible conflicts"
                    : "No conflicts found in checked classes",
                )}
              </p>
              {result.items.map((r) => (
                <article
                  key={r.kind + r.id}
                  className="min-w-0 space-y-1 rounded-xl bg-secondary p-3 text-sm"
                >
                  <p className="font-medium">{t(r.warning)}</p>
                  <p className="break-words">
                    {r.classroom_name} · {r.title}
                  </p>
                  <time>
                    {new Date(r.starts_at).toLocaleString(locale)}
                    {r.kind === "exam"
                      ? ` – ${new Date(r.ends_at).toLocaleString(locale)}`
                      : ""}
                  </time>
                  <p className="text-xs text-muted-foreground">
                    {t("Shared enrolled students")}: {r.shared_students}
                  </p>
                </article>
              ))}
              {result.truncated && (
                <p role="status" className="text-sm">
                  {t("Results are limited; narrow your date range.")}
                </p>
              )}
            </section>
          )
        ))}
    </details>
  );
}
