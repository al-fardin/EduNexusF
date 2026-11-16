"use client";
import { useQuery } from "@tanstack/react-query";
import { sections } from "@/services/sections";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function SectionPicker({
  classId,
  value,
  onChange,
  enabled = true,
}: {
  classId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  enabled?: boolean;
}) {
  const { t } = usePreferences(),
    user = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["class-sections", user, classId],
    queryFn: () => sections.list(classId),
    enabled: enabled && !!user,
  });
  if (!enabled) return null;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {t("Sections (optional)")}
      </legend>
      {query.isPending ? (
        <ContentSkeleton rows={1} />
      ) : query.isError ? (
        <ErrorState message={examError(query.error)} />
      ) : !query.data?.length ? (
        <p className="text-xs text-muted-foreground">
          {t(
            "No sections. Everyone remains available; create sections only if needed.",
          )}
        </p>
      ) : (
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {query.data.map((s) => (
            <label
              key={s.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <input
                type="checkbox"
                checked={value.includes(s.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, s.id]
                      : value.filter((v) => v !== s.id),
                  )
                }
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          "No section selected means the whole class. Section selection is combined with roll rules.",
        )}
      </p>
    </fieldset>
  );
}
