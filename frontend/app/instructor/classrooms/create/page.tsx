"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  LoaderCircle,
  School,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
} from "react";

import {AuthGuard} from "@/components/auth/auth-guard";
import {
  classroomService,
  CreateClassroomInput,
  getClassroomErrorMessage,
} from "@/services/classroom";

const initialForm: CreateClassroomInput = {
  name: "",
  section: "",
  subject: "",
  room: "",
  description: "",
};

export default function CreateClassroomPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<CreateClassroomInput>(
      initialForm
    );

  const createMutation = useMutation({
    mutationFn: classroomService.create,

    onSuccess: () => {
      router.push(
        "/instructor/classrooms"
      );
    },
  });

  function updateField(
    field: keyof CreateClassroomInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    createMutation.mutate({
      name: form.name.trim(),
      section: form.section.trim(),
      subject: form.subject.trim(),
      room: form.room.trim(),
      description:
        form.description.trim(),
    });
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/instructor/classrooms"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={18} />
            Teaching classes
          </Link>

          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-primary px-6 py-8 text-white sm:px-8">
              <div className="mb-4 inline-flex rounded-2xl bg-card/10 p-3">
                <School size={28} />
              </div>

              <h1 className="text-3xl font-bold">
                Create a class
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Students will join this
                classroom using the
                automatically generated class
                code.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 sm:p-8"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Class name
                  <span className="text-[#b34450]">
                    {" "}
                    *
                  </span>
                </label>

                <input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  required
                  maxLength={150}
                  placeholder="CSE 2258 Numerical Methods"
                  className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="section"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Section
                  </label>

                  <input
                    id="section"
                    value={form.section}
                    onChange={(event) =>
                      updateField(
                        "section",
                        event.target.value
                      )
                    }
                    maxLength={100}
                    placeholder="Section A"
                    className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="room"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Room
                  </label>

                  <input
                    id="room"
                    value={form.room}
                    onChange={(event) =>
                      updateField(
                        "room",
                        event.target.value
                      )
                    }
                    maxLength={100}
                    placeholder="Room 301"
                    className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-semibold"
                >
                  Subject
                </label>

                <div className="relative">
                  <BookOpen
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <input
                    id="subject"
                    value={form.subject}
                    onChange={(event) =>
                      updateField(
                        "subject",
                        event.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Numerical Methods"
                    className="w-full rounded-xl border border-border py-3 pl-11 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  maxLength={5000}
                  rows={5}
                  placeholder="Write a short description about this class."
                  className="w-full resize-none rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {createMutation.isError && (
                <div className="rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
                  {getClassroomErrorMessage(
                    createMutation.error
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                <Link
                  href="/instructor/classrooms"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-secondary"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={
                    createMutation.isPending
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <School size={18} />
                      Create class
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}