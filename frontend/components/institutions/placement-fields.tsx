"use client";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  institutions,
  type InstitutionPlacement,
} from "@/services/institutions";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
const field =
  "min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm";
export function InstitutionPlacementFields({
  value,
  onChange,
  disabled = false,
}: {
  value: InstitutionPlacement | null;
  onChange: (v: InstitutionPlacement | null) => void;
  disabled?: boolean;
}) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id),
    [open, setOpen] = useState(false);
  const list = useInfiniteQuery({
    queryKey: ["institution-choices", user],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => institutions.list(pageParam, true),
    getNextPageParam: (p) => (p.next_offset < 0 ? undefined : p.next_offset),
    enabled: open && !!user,
  });
  const org = useQuery({
    queryKey: ["institution", user, value?.institution_id],
    queryFn: () => institutions.get(value!.institution_id),
    enabled: open && !!user && !!value?.institution_id,
  });
  return (
    <details
      className="min-w-0 space-y-3 rounded-xl border border-border p-3"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {t("Institution (optional)")} ·{" "}
        {t(value?.institution_id ? "Institutional class" : "Standalone class")}
      </summary>
      <p className="text-xs text-muted-foreground">
        {t(
          "Leave this unused to create a normal class. Institution membership does not replace class enrollment.",
        )}
      </p>
      <fieldset disabled={disabled} className="min-w-0 space-y-3">
        <legend className="sr-only">{t("Institution")}</legend>
        <label className="grid gap-1 text-sm">
          {t("Institution")}
          <select
            value={value?.institution_id ?? ""}
            className={field}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? {
                      institution_id: e.target.value,
                      department_id: "",
                      term_id: "",
                    }
                  : null,
              )
            }
          >
            <option value="">{t("Standalone class")}</option>
            {list.data?.pages
              .flatMap((p) => p.items)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </select>
        </label>
        {list.isFetching && <ContentSkeleton rows={1} />}
        {list.isError && <ErrorState message={examError(list.error)} />}
        {list.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {t("More institutions")}
          </Button>
        )}
        {value?.institution_id &&
          (org.isPending ? (
            <ContentSkeleton rows={2} />
          ) : org.isError ? (
            <ErrorState message={examError(org.error)} />
          ) : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1 text-sm">
                {t("Department (optional)")}
                <select
                  className={field}
                  value={value.department_id}
                  onChange={(e) =>
                    onChange({ ...value, department_id: e.target.value })
                  }
                >
                  <option value="">{t("Unassigned")}</option>
                  {org.data.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                {t("Institution semester (optional)")}
                <select
                  className={field}
                  value={value.term_id}
                  onChange={(e) =>
                    onChange({ ...value, term_id: e.target.value })
                  }
                >
                  <option value="">{t("Unassigned")}</option>
                  {org.data.terms.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.starts_on}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
      </fieldset>
    </details>
  );
}
export function ClassInstitutionSettings({ classId }: { classId: string }) {
  const user = useAuthStore((s) => s.user?.id),
    { t } = usePreferences();
  const query = useQuery({
    queryKey: ["class-institution", user, classId],
    queryFn: () => institutions.placement(classId),
  });
  return query.isPending ? (
    <ContentSkeleton rows={3} />
  ) : query.isError ? (
    <ErrorState
      message={examError(query.error)}
      onRetry={() => void query.refetch()}
    />
  ) : (
    <div className="space-y-3">
      <p className="break-words text-sm">
        {query.data.name || t("Standalone class")}
        {query.data.department ? ` · ${query.data.department}` : ""}
        {query.data.semester ? ` · ${query.data.semester}` : ""}
      </p>
      {query.data.can_manage ? (
        <PlacementForm
          key={query.data.version}
          classId={classId}
          initial={
            query.data.placement.institution_id ? query.data.placement : null
          }
          version={query.data.version}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("Only the class owner can change its institution.")}
        </p>
      )}
    </div>
  );
}
function PlacementForm({
  classId,
  initial,
  version,
}: {
  classId: string;
  initial: InstitutionPlacement | null;
  version: number;
}) {
  const { t } = usePreferences(),
    client = useQueryClient(),
    [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void institutions
          .place(classId, value, version)
          .then(() =>
            Promise.all(
              ["class-institution", "institution-classes", "institutions"].map(
                (k) => client.invalidateQueries({ queryKey: [k] }),
              ),
            ),
          )
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      <InstitutionPlacementFields
        value={value}
        onChange={setValue}
        disabled={busy}
      />
      {error && <ErrorState message={error} />}
      <Button type="submit" className="min-h-11" disabled={busy}>
        {t("Save institution settings")}
      </Button>
    </form>
  );
}
