"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LogIn,
  MapPin,
  School,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import {
  classroomService,
  getClassroomErrorMessage,
} from "@/services/classroom";

const pageSize = 10;

export default function StudentClassroomsPage() {
  const [page, setPage] = useState(1);

  const classroomsQuery = useQuery({
    queryKey: [
      "classrooms",
      "joined",
      page,
      pageSize,
    ],

    queryFn: () =>
      classroomService.listJoined(
        page,
        pageSize
      ),
  });

  const classrooms =
    classroomsQuery.data?.items ?? [];

  const hasNextPage =
    classrooms.length === pageSize;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/"
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft size={18} />
                Dashboard
              </Link>

              <h1 className="text-3xl font-bold">
                My classes
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Open your joined classes and
                continue class activities.
              </p>
            </div>

            <Link
              href="/student/classrooms/join"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#536058]"
            >
              <LogIn size={18} />
              Join class
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
                Unable to load classes.
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
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary">
                  <School size={30} />
                </div>

                <h2 className="mt-5 text-xl font-bold">
                  No joined classes
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Ask your instructor for a
                  class code and join your
                  first classroom.
                </p>

                <Link
                  href="/student/classrooms/join"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
                >
                  <LogIn size={18} />
                  Join class
                </Link>
              </div>
            )}

          {!classroomsQuery.isPending &&
            !classroomsQuery.isError &&
            classrooms.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {classrooms.map(
                  (classroom) => (
                    <article
                      key={classroom.id}
                      className="flex min-h-72 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                    >
                      <div className="bg-primary p-6 text-white">
                        <div className="mb-5 inline-flex rounded-xl bg-card/10 p-2.5">
                          <School size={22} />
                        </div>

                        <h2 className="line-clamp-2 text-xl font-bold">
                          {classroom.name}
                        </h2>

                        {classroom.section && (
                          <p className="mt-1 text-sm text-slate-300">
                            {classroom.section}
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
                        </div>

                        {classroom.description && (
                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {classroom.description}
                          </p>
                        )}

                        <Link
                          href={`/student/classrooms/${classroom.id}`}
                          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#536058]"
                        >
                          Open class
                          <ArrowRight size={17} />
                        </Link>
                      </div>
                    </article>
                  )
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
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
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
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
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