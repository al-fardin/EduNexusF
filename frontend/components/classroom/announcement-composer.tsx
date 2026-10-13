"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  LoaderCircle,
  Megaphone,
  Send,
} from "lucide-react";
import {
  type FormEvent,
  useState,
} from "react";

import {
  type AnnouncementInput,
  getStreamErrorMessage,
  streamService,
} from "@/services/stream";

type AnnouncementComposerProps = {
  classroomId: string;
  onCreated?: () => void;
};

const initialForm: AnnouncementInput = {
  title: "",
  content: "",
};

export function AnnouncementComposer({
  classroomId,
  onCreated,
}: AnnouncementComposerProps) {
  const queryClient = useQueryClient();

  const [form, setForm] =
    useState<AnnouncementInput>(
      initialForm
    );

  const createMutation = useMutation({
    mutationFn: (
      input: AnnouncementInput
    ) =>
      streamService.createAnnouncement(
        classroomId,
        input
      ),

    onSuccess: async () => {
      setForm({
        title: "",
        content: "",
      });

      onCreated?.();

      await queryClient.invalidateQueries({
        queryKey: [
          "classrooms",
          "stream",
          classroomId,
        ],
      });
    },
  });

  function updateField(
    field: keyof AnnouncementInput,
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

    const title = form.title.trim();
    const content = form.content.trim();

    if (
      !content ||
      createMutation.isPending
    ) {
      return;
    }

    createMutation.mutate({
      title,
      content,
    });
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
          <Megaphone size={21} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground">
            Create announcement
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Share class notices, reminders
            and important updates.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            htmlFor="announcement-title"
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Title
            <span className="ml-1 font-normal text-muted-foreground">
              Optional
            </span>
          </label>

          <input
            id="announcement-title"
            type="text"
            maxLength={200}
            value={form.title}
            disabled={
              createMutation.isPending
            }
            onChange={(event) =>
              updateField(
                "title",
                event.target.value
              )
            }
            placeholder="Example: Tomorrow's class update"
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-secondary sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="announcement-content"
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Announcement
          </label>

          <textarea
            id="announcement-content"
            required
            rows={5}
            value={form.content}
            disabled={
              createMutation.isPending
            }
            onChange={(event) =>
              updateField(
                "content",
                event.target.value
              )
            }
            placeholder="Write the announcement details..."
            className="min-h-32 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-base leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-secondary sm:text-sm"
          />
        </div>

        {createMutation.isError && (
          <div
            role="alert"
            className="rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]"
          >
            {getStreamErrorMessage(
              createMutation.error
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              !form.content.trim() ||
              createMutation.isPending
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {createMutation.isPending ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Posting...
              </>
            ) : (
              <>
                <Send size={18} />
                Post announcement
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}