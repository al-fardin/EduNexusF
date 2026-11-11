"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import { examError } from "@/services/exams";
type Entry = {
    id: string;
    actor: string;
    action: string;
    title: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
    created_at: string;
};
const actions: Record<string, string> = { assignment_rubric:"Rubric grade",assignment_grade: "Assignment grade", exam_grade: "Exam grade", assignment_deadline: "Assignment deadline", exam_schedule: "Exam schedule", material_deleted: "Material deleted" };
const fields: Record<string, string> = { points: "Points", feedback: "Feedback", due_at: "Deadline", starts_at: "Starts", ends_at: "Ends", closed_at: "Closed", file_name: "File", version: "Version" };
function value(key: string, v: unknown) { return v === null || v === undefined ? "—" : key.endsWith("_at") ? new Date(String(v)).toLocaleString() : String(v); }
export function ActivityHistory({ classroomId }: {
    classroomId: string;
}) {
    const query = useInfiniteQuery({ queryKey: ["classroom-activity", classroomId], initialPageParam: "", queryFn: async ({ pageParam }) => (await api.get<{
            data: {
                items: Entry[];
                next: string;
            };
        }>(`/classrooms/${classroomId}/activity`, { params: pageParam ? { before: pageParam } : {} })).data.data, getNextPageParam: last => last.next || undefined });
    const items = query.data?.pages.flatMap(p => p.items) ?? [];
    return <section className="space-y-4"><header><h2 className="text-xl font-semibold">Activity history</h2><p className="mt-1 text-sm text-muted-foreground">Teacher changes to grades, deadlines and materials.</p></header>{query.isPending ? <ContentSkeleton rows={3}/> : query.isError ? <ErrorState message={examError(query.error)} onRetry={() => void query.refetch()}/> : !items.length ? <EmptyState title="No recorded changes"/> : items.map(entry => <article key={entry.id} className="space-y-3 rounded-2xl border border-border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{actions[entry.action] ?? entry.action} · {entry.title}</h3><p className="mt-1 text-xs text-muted-foreground">{entry.actor} · {new Date(entry.created_at).toLocaleString()}</p></div></div><dl className="space-y-2 text-sm">{Object.keys({ ...entry.before, ...entry.after }).filter(key => fields[key] && entry.before[key] !== entry.after[key]).map(key => <div key={key} className="grid gap-1 sm:grid-cols-[100px_1fr]"><dt className="text-muted-foreground">{fields[key]}</dt><dd className="whitespace-pre-wrap break-words">{value(key, entry.before[key])} → {value(key, entry.after[key])}</dd></div>)}</dl><p className="text-sm text-muted-foreground">{entry.reason || "No reason provided."}</p></article>)}{query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading…" : "Older changes"}</Button>}</section>;
}
