"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
    ArrowRight,
  BookOpen,
  Copy,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  School,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {AuthGuard} from "@/components/auth/auth-guard";
import {
  Classroom,
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

const pageSize = 10;

export default function TeachingClassroomsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [copiedCode, setCopiedCode] =
    useState<string | null>(null);

  const classroomsQuery = useQuery({
    queryKey: [
      "classrooms",
      "mine",
      page,
      pageSize,
    ],
    queryFn: () =>
      classroomService.listMine(
        page,
        pageSize
      ),
  });

  const archiveMutation = useMutation({
    mutationFn: classroomService.archive,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "classrooms",
          "mine",
        ],
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn:
      classroomService.unarchive,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "classrooms",
          "mine",
        ],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classroomService.remove,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "classrooms",
          "mine",
        ],
      });
    },
  });

  async function copyClassCode(
    code: string
  ) {
    await navigator.clipboard.writeText(
      code
    );

    setCopiedCode(code);

    window.setTimeout(() => {
      setCopiedCode(null);
    }, 1500);
  }

  function removeClassroom(
    classroom: Classroom
  ) {
    const confirmed = window.confirm(
      `Delete "${classroom.name}"? This action will hide the classroom and its memberships.`
    );

    if (confirmed) {
      deleteMutation.mutate(
        classroom.id
      );
    }
  }

  const classrooms =
    classroomsQuery.data?.items ?? [];

  const hasNextPage =
    classrooms.length === pageSize;

  const mutationError =
    archiveMutation.error ??
    restoreMutation.error ??
    deleteMutation.error;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/"
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft size={18} />
                Dashboard
              </Link>

              <h1 className="text-3xl font-bold">
                Teaching classes
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Create classes, share class
                codes and manage your
                students.
              </p>
            </div>

            <Link
              href="/instructor/classrooms/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#536058]"
            >
              <Plus size={18} />
              Create class
            </Link>
          </div>

          {classroomsQuery.isPending && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-3xl border border-border bg-card"
                />
              ))}
            </div>
          )}

          {classroomsQuery.isError && (
            <div className="rounded-3xl border border-[#ffd0d0] bg-[#fff0ef] p-8 text-center">
              <p className="font-semibold text-red-800">
                Unable to load classrooms.
              </p>

              <p className="mt-2 text-sm text-[#b34450]">
                {getClassroomErrorMessage(
                  classroomsQuery.error
                )}
              </p>

              <button
                type="button"
                onClick={() =>
                  classroomsQuery.refetch()
                }
                className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!classroomsQuery.isPending &&
            !classroomsQuery.isError &&
            classrooms.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary">
                  <School size={30} />
                </div>

                <h2 className="text-xl font-bold">
                  No classes created
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Create your first class.
                  EduNexus will generate a
                  unique code that students
                  can use to join.
                </p>

                <Link
                  href="/instructor/classrooms/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus size={18} />
                  Create class
                </Link>
              </div>
            )}

          {!classroomsQuery.isPending &&
            !classroomsQuery.isError &&
            classrooms.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {classrooms.map(
                  (classroom) => {
                    const archiving =
                      archiveMutation.isPending &&
                      archiveMutation.variables ===
                        classroom.id;

                    const restoring =
                      restoreMutation.isPending &&
                      restoreMutation.variables ===
                        classroom.id;

                    const deleting =
                      deleteMutation.isPending &&
                      deleteMutation.variables ===
                        classroom.id;

                    return (
                      <article
                        key={classroom.id}
                        className="flex min-h-72 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                      >
                        <div className="bg-primary p-6 text-white">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="rounded-xl bg-card/10 p-2.5">
                              <School
                                size={22}
                              />
                            </div>

                            <span className="rounded-full bg-card/10 px-3 py-1 text-xs font-semibold capitalize">
                              {classroom.status}
                            </span>
                          </div>

                          <h2 className="line-clamp-2 text-xl font-bold">
                            {classroom.name}
                          </h2>

                          {classroom.section && (
                            <p className="mt-1 text-sm text-slate-300">
                              {
                                classroom.section
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                          <div className="space-y-3 text-sm text-muted-foreground">
                            {classroom.subject && (
                              <p className="flex items-center gap-2">
                                <BookOpen
                                  size={17}
                                />
                                {
                                  classroom.subject
                                }
                              </p>
                            )}

                            {classroom.room && (
                              <p className="flex items-center gap-2">
                                <MapPin
                                  size={17}
                                />
                                {classroom.room}
                              </p>
                            )}

                            <p className="flex items-center gap-2">
                              <Users size={17} />
                              People
                            </p>
                          </div>

                          <div className="mt-5 rounded-2xl bg-secondary p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Class code
                            </p>

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <code className="text-lg font-bold tracking-widest">
                                {
                                  classroom.class_code
                                }
                              </code>

                              <button
                                type="button"
                                onClick={() =>
                                  copyClassCode(
                                    classroom.class_code
                                  )
                                }
                                className="rounded-lg p-2 transition hover:bg-card"
                                aria-label="Copy class code"
                              >
                                <Copy
                                  size={17}
                                />
                              </button>
                            </div>

                            {copiedCode ===
                              classroom.class_code && (
                              <p className="mt-2 text-xs font-medium text-emerald-700">
                                Class code
                                copied.
                              </p>
                            )}
                          </div>

                          <div className="mt-auto flex items-center justify-end gap-2 pt-5">
                            <Link
  href={`/instructor/classrooms/${classroom.id}`}
  className="mr-auto inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#536058]"
>
  Open
  <ArrowRight size={15} />
</Link>
                            
                            {classroom.status ===
                            "active" ? (
                              <button
                                type="button"
                                disabled={
                                  archiving
                                }
                                onClick={() =>
                                  archiveMutation.mutate(
                                    classroom.id
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-secondary disabled:opacity-50"
                              >
                                {archiving ? (
                                  <LoaderCircle
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Archive
                                    size={15}
                                  />
                                )}
                                Archive
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  restoring
                                }
                                onClick={() =>
                                  restoreMutation.mutate(
                                    classroom.id
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-secondary disabled:opacity-50"
                              >
                                {restoring ? (
                                  <LoaderCircle
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <RotateCcw
                                    size={15}
                                  />
                                )}
                                Restore
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() =>
                                removeClassroom(
                                  classroom
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-[#ffd0d0] px-3 py-2 text-xs font-semibold text-[#b34450] transition hover:bg-[#fff0ef] disabled:opacity-50"
                            >
                              {deleting ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={15}
                                />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

          {mutationError && (
            <div className="mt-6 rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
              {getClassroomErrorMessage(
                mutationError
              )}
            </div>
          )}

          {!classroomsQuery.isPending &&
            !classroomsQuery.isError &&
            classrooms.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                    )
                  }
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm font-semibold">
                  Page {page}
                </span>

                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
        </div>
      </main>
    </AuthGuard>
  );
}