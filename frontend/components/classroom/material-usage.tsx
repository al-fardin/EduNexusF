"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePreferences } from "@/providers/preferences-provider";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
export function MaterialDeleteDialog({
  classId,
  material,
  close,
  confirm,
}: {
  classId: string;
  material: { id: string; title: string } | null;
  close: () => void;
  confirm: (reason: string) => Promise<void>;
}) {
  const { t } = usePreferences();
  const usage = useQuery({
    queryKey: ["material-usage", classId, material?.id],
    queryFn: async () =>
      (
        await api.get<{
          data: {
            stream_posts: number;
            syllabus_reference: boolean;
            note: string;
          };
        }>(`/classrooms/${classId}/materials/${material!.id}/usage`)
      ).data.data,
    enabled: !!material,
  });
  return (
    <ReasonDialog
      open={!!material}
      onOpenChange={(v) => {
        if (!v) close();
      }}
      title={t("Delete material")}
      description={material?.title ?? ""}
      ready={usage.isSuccess}
      details={
        usage.isPending ? (
          <ContentSkeleton rows={1} />
        ) : usage.isError ? (
          <ErrorState
            message={examError(usage.error)}
            onRetry={() => void usage.refetch()}
          />
        ) : (
          <div className="space-y-2 rounded-xl bg-secondary p-3 text-sm">
            <p>
              {usage.data.stream_posts} {t("linked stream posts")}
              {usage.data.syllabus_reference
                ? ` · ${t("Referenced in syllabus")}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Deleting removes the shared file. Previously downloaded copies and external links cannot be recalled.",
              )}
            </p>
          </div>
        )
      }
      onConfirm={confirm}
    />
  );
}
