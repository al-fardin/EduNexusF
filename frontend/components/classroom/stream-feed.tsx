"use client";
import { ExamMarksheetDownload } from "@/components/classroom/exam-marksheet-download";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useState,
} from "react";

import { AnnouncementComposer } from "@/components/classroom/announcement-composer";
import { MaterialUploadForm, MaterialDownloadButton } from "@/components/classroom/material-library";
import { materialService } from "@/services/materials";
import {
  type AnnouncementInput,
  getStreamErrorMessage,
  type StreamPost,
  streamService,
} from "@/services/stream";

type StreamFeedProps = {
  classroomId: string;
  canManage: boolean;
};

type UpdatePostVariables = {
  postId: string;
  input: AnnouncementInput;
};

type AnnouncementDetailsModalProps = {
  post: StreamPost;
  onClose: () => void;
};

const pageSize = 10;

export function StreamFeed({
  classroomId,
  canManage,
}: StreamFeedProps) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState<StreamPost | null>(null);

  const [
    editingPostId,
    setEditingPostId,
  ] = useState<string | null>(null);

  const [editForm, setEditForm] =
    useState<AnnouncementInput>({
      title: "",
      content: "",
    });

  const streamQueryKey = [
    "classrooms",
    "stream",
    classroomId,
  ] as const;

  const streamQuery = useQuery({
    queryKey: [
      ...streamQueryKey,
      page,
      pageSize,
    ],

    queryFn: () =>
      streamService.list(
        classroomId,
        page,
        pageSize
      ),

    enabled: Boolean(classroomId),
  });

  const materialsQuery = useQuery({
    queryKey: ["materials", classroomId],
    queryFn: () => materialService.list(classroomId),
    enabled: Boolean(classroomId),
  });

  async function invalidateStream() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: streamQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["materials", classroomId] }),
    ]);
  }

  const updateMutation = useMutation({
    mutationFn: ({
      postId,
      input,
    }: UpdatePostVariables) =>
      streamService.updateAnnouncement(
        classroomId,
        postId,
        input
      ),

    onSuccess: async () => {
      setEditingPostId(null);

      setEditForm({
        title: "",
        content: "",
      });

      await invalidateStream();
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (post: StreamPost) =>
      post.is_pinned
        ? streamService.unpin(
            classroomId,
            post.id
          )
        : streamService.pin(
            classroomId,
            post.id
          ),

    onSuccess: invalidateStream,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) =>
      streamService.remove(
        classroomId,
        postId
      ),

    onSuccess: async (
      _data,
      deletedPostId
    ) => {
      if (
        selectedPost?.id ===
        deletedPostId
      ) {
        setSelectedPost(null);
      }

      await invalidateStream();
    },
  });

  const posts =
    streamQuery.data?.items ?? [];

  const canGoNext =
    posts.length === pageSize;

  function beginEditing(
    post: StreamPost
  ) {
    updateMutation.reset();

    setEditingPostId(post.id);

    setEditForm({
      title: post.title ?? "",
      content: post.content,
    });
  }

  function cancelEditing() {
    updateMutation.reset();

    setEditingPostId(null);

    setEditForm({
      title: "",
      content: "",
    });
  }

  function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    postId: string
  ) {
    event.preventDefault();

    const title =
      editForm.title.trim();

    const content =
      editForm.content.trim();

    if (
      !content ||
      updateMutation.isPending
    ) {
      return;
    }

    updateMutation.mutate({
      postId,
      input: {
        title,
        content,
      },
    });
  }

  function removePost(
    post: StreamPost
  ) {
    const confirmed = window.confirm(
      "Delete this stream post? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(post.id);
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <>
          <AnnouncementComposer classroomId={classroomId} onCreated={() => setPage(1)} />
          <MaterialUploadForm classroomId={classroomId} compact />
        </>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Class stream
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Announcements and recent
              classroom activity.
            </p>
          </div>

          <button
            type="button"
            disabled={
              streamQuery.isFetching
            }
            onClick={() => {
              void streamQuery.refetch();
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                streamQuery.isFetching
                  ? "animate-spin"
                  : undefined
              }
            />

            Refresh
          </button>
        </header>

        <div className="p-4 sm:p-6">
          {streamQuery.isPending && (
            <StreamLoading />
          )}

          {streamQuery.isError && (
            <div className="rounded-2xl border border-[#ffd0d0] bg-[#fff0ef] p-6 text-center">
              <AlertCircle
                size={36}
                className="mx-auto text-[#b34450]"
              />

              <h3 className="mt-3 font-bold text-red-900">
                Unable to load stream
              </h3>

              <p className="mt-2 text-sm text-[#b34450]">
                {getStreamErrorMessage(
                  streamQuery.error
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  void streamQuery.refetch();
                }}
                className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!streamQuery.isPending &&
            !streamQuery.isError &&
            posts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <Megaphone size={27} />
                </div>

                <h3 className="mt-4 text-lg font-bold text-foreground">
                  {page > 1
                    ? "No more stream posts"
                    : "No announcements yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {page > 1
                    ? "Return to the previous page to see earlier posts."
                    : canManage
                      ? "Create the first announcement for this classroom."
                      : "Teacher announcements will appear here."}
                </p>
              </div>
            )}

          {!streamQuery.isPending &&
            !streamQuery.isError &&
            posts.length > 0 && (
              <div className="space-y-4">
                {posts.map((post) => {
                  const authorName =
                    getAuthorName(post);

                  const pinning =
                    togglePinMutation
                      .isPending &&
                    togglePinMutation
                      .variables?.id ===
                      post.id;

                  const deleting =
                    deleteMutation
                      .isPending &&
                    deleteMutation
                      .variables === post.id;

                  const updating =
                    updateMutation
                      .isPending &&
                    updateMutation
                      .variables?.postId ===
                      post.id;

                  const isBusy =
                    pinning ||
                    deleting ||
                    updating;

                  return (
                    <article
                      key={post.id}
                      className={`rounded-2xl border p-4 sm:p-5 ${
                        post.is_pinned
                          ? "border-amber-300 bg-[#e9ede5]/60"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                            {getInitials(
                              authorName
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-bold text-foreground">
                                {authorName}
                              </p>

                              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">
                                {
                                  post.post_type
                                }
                              </span>

                              {post.is_pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900">
                                  <Pin
                                    size={
                                      13
                                    }
                                  />
                                  Pinned
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatPostDate(
                                post.created_at
                              )}

                              {post.updated_at !==
                                post.created_at &&
                                " · Edited"}
                            </p>
                          </div>
                        </div>

                        {canManage && (
                          <div className="grid grid-cols-3 gap-2 sm:flex">
                            <button
                              type="button"
                              disabled={
                                isBusy
                              }
                              onClick={() =>
                                togglePinMutation.mutate(
                                  post
                                )
                              }
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pinning ? (
                                <LoaderCircle
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                />
                              ) : post.is_pinned ? (
                                <PinOff
                                  size={
                                    15
                                  }
                                />
                              ) : (
                                <Pin
                                  size={
                                    15
                                  }
                                />
                              )}

                              {post.is_pinned
                                ? "Unpin"
                                : "Pin"}
                            </button>

                            {post.post_type ===
                              "announcement" && (
                              <button
                                type="button"
                                disabled={
                                  isBusy
                                }
                                onClick={() =>
                                  beginEditing(
                                    post
                                  )
                                }
                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil
                                  size={
                                    15
                                  }
                                />
                                Edit
                              </button>
                            )}

                            {post.post_type !== "material" && <button
                              type="button"
                              disabled={
                                isBusy
                              }
                              onClick={() =>
                                removePost(
                                  post
                                )
                              }
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#ffd0d0] px-3 py-2 text-xs font-semibold text-[#b34450] transition hover:bg-[#fff0ef] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleting ? (
                                <LoaderCircle
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={
                                    15
                                  }
                                />
                              )}

                              Delete
                            </button>}
                          </div>
                        )}
                      </div>

                      {editingPostId ===
                      post.id ? (
                        <form
                          onSubmit={(event) =>
                            handleUpdate(
                              event,
                              post.id
                            )
                          }
                          className="mt-5 space-y-4 border-t border-border pt-5"
                        >
                          <div>
                            <label
                              htmlFor={`edit-title-${post.id}`}
                              className="mb-2 block text-sm font-semibold text-foreground"
                            >
                              Title
                            </label>

                            <input
                              id={`edit-title-${post.id}`}
                              type="text"
                              maxLength={
                                200
                              }
                              value={
                                editForm.title
                              }
                              disabled={
                                updating
                              }
                              onChange={(
                                event
                              ) =>
                                setEditForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    title:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-content-${post.id}`}
                              className="mb-2 block text-sm font-semibold text-foreground"
                            >
                              Announcement
                            </label>

                            <textarea
                              id={`edit-content-${post.id}`}
                              required
                              rows={5}
                              value={
                                editForm.content
                              }
                              disabled={
                                updating
                              }
                              onChange={(
                                event
                              ) =>
                                setEditForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    content:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              className="min-h-32 w-full resize-y rounded-xl border border-border px-3 py-3 text-base leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-sm"
                            />
                          </div>

                          {updateMutation.isError &&
                            updateMutation
                              .variables
                              ?.postId ===
                              post.id && (
                              <div className="rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
                                {getStreamErrorMessage(
                                  updateMutation.error
                                )}
                              </div>
                            )}

                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              disabled={
                                updating
                              }
                              onClick={
                                cancelEditing
                              }
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
                            >
                              <X size={17} />
                              Cancel
                            </button>

                            <button
                              type="submit"
                              disabled={
                                updating ||
                                !editForm.content.trim()
                              }
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updating ? (
                                <LoaderCircle
                                  size={
                                    17
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Save
                                  size={
                                    17
                                  }
                                />
                              )}

                              Save changes
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-5">
                          {post.title && (
                            <h3 className="text-lg font-bold text-foreground">
                              {
                                post.title
                              }
                            </h3>
                          )}

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                            {post.content}
                          </p>

                          {post.reference_type === "exam" && post.reference_id && post.title?.startsWith("Exam results:") && <ExamMarksheetDownload classroomId={classroomId} examId={post.reference_id} />}

                          {post.post_type === "material" && post.reference_id && (
                            <div className="mt-4">
                              {canManage && <p className="mb-2 text-xs text-muted-foreground">To remove an attachment, open Classwork.</p>}
                              <MaterialDownloadButton
                                classroomId={classroomId}
                                materialId={post.reference_id}
                                filename={materialsQuery.data?.find((item) => item.id === post.reference_id)?.file_name ?? post.title ?? "material"}
                                label="Download attachment"
                              />
                            </div>
                          )}

                          {post.reference_type && (
                            <span className="mt-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                              Linked{" "}
                              {
                                post.reference_type
                              }
                            </span>
                          )}

                          <div className="mt-5 border-t border-border pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPost(
                                  post
                                )
                              }
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary sm:w-auto"
                            >
                              <Eye
                                size={
                                  17
                                }
                              />
                              View post
                              details
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

          {(togglePinMutation.isError ||
            deleteMutation.isError) && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]"
            >
              {getStreamErrorMessage(
                togglePinMutation.error ??
                  deleteMutation.error
              )}
            </div>
          )}

          {!streamQuery.isPending &&
            !streamQuery.isError && (
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  disabled={
                    page === 1 ||
                    streamQuery.isFetching
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={17}
                  />
                  Previous
                </button>

                <span className="text-sm font-semibold text-muted-foreground">
                  Page {page}
                </span>

                <button
                  type="button"
                  disabled={
                    !canGoNext ||
                    streamQuery.isFetching
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            )}
        </div>
      </section>

      {selectedPost && (
        <AnnouncementDetailsModal
          post={selectedPost}
          onClose={() =>
            setSelectedPost(null)
          }
        />
      )}
    </div>
  );
}

function AnnouncementDetailsModal({
  post,
  onClose,
}: AnnouncementDetailsModalProps) {
  const authorName =
    getAuthorName(post);

  const wasEdited =
    post.updated_at !==
    post.created_at;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/60 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-details-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                {post.post_type}
              </span>

              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                  <Pin size={13} />
                  Pinned
                </span>
              )}
            </div>

            <h2
              id="announcement-details-title"
              className="mt-3 text-2xl font-bold text-foreground"
            >
              Stream post details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close announcement details"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-secondary"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {getInitials(authorName)}
          </div>

          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">
              {authorName}
            </p>

            {post.author?.email && (
              <p className="truncate text-sm text-muted-foreground">
                {post.author.email}
              </p>
            )}
          </div>
        </div>

        <article className="mt-6 rounded-2xl border border-border bg-background p-5 sm:p-6">
          <h3 className="text-xl font-bold leading-8 text-foreground">
            {post.title?.trim() ||
              "Announcement"}
          </h3>

          <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-foreground">
            {post.content}
          </p>

          {post.reference_type && (
            <div className="mt-5">
              <span className="inline-flex rounded-full bg-card px-3 py-1.5 text-xs font-semibold capitalize text-muted-foreground ring-1 ring-slate-200">
                Linked{" "}
                {post.reference_type}
              </span>
            </div>
          )}
        </article>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Published
            </p>

            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatPostDate(
                post.created_at
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last updated
            </p>

            <p className="mt-2 text-sm font-semibold text-foreground">
              {wasEdited
                ? formatPostDate(
                    post.updated_at
                  )
                : "Not edited"}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#536058] sm:w-auto sm:min-w-32"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function StreamLoading() {
  return (
    <div className="space-y-4">
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-3">
            <div className="size-11 animate-pulse rounded-full bg-accent" />

            <div className="flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-accent" />

              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-accent" />
            </div>
          </div>

          <div className="mt-5 h-5 w-2/3 animate-pulse rounded bg-accent" />

          <div className="mt-3 h-4 w-full animate-pulse rounded bg-accent" />

          <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-accent" />
        </div>
      ))}
    </div>
  );
}

function getAuthorName(
  post: StreamPost
): string {
  const firstName =
    post.author?.first_name?.trim() ??
    "";

  const lastName =
    post.author?.last_name?.trim() ??
    "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    post.author?.username ||
    post.author?.email ||
    "EduNexus"
  );
}

function getInitials(
  name: string
): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return initials || "EN";
}

function formatPostDate(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}