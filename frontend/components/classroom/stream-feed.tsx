"use client";
import {AnnouncementDetailsModal} from "./announcement-details";
import {getAuthorName,getInitials,formatPostDate} from "./stream-format";
import {ContentSkeleton} from "@/components/ui/content-skeleton";
import { useClassroomComposer } from "@/lib/classroom-composer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, FileUp, MoreHorizontal } from "lucide-react";
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

const pageSize = 10;

export function StreamFeed({
  classroomId,
  canManage,
}: StreamFeedProps) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [composer,setComposer]=useClassroomComposer();

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

  if(canManage&&(composer==="announcement"||composer==="material"))return <div className="en-composer-view"><button className="en-composer-back" onClick={()=>setComposer(null)}><ArrowLeft size={17}/>Back to stream</button>{composer==="announcement"?<AnnouncementComposer classroomId={classroomId} onCreated={()=>{setPage(1);setComposer(null)}}/>:<MaterialUploadForm classroomId={classroomId} onUploaded={()=>{setPage(1);setComposer(null)}}/>}</div>;
  return (
    <div className="space-y-5">
      {canManage&&<div className="en-stream-compose-bar"><button className="en-stream-compose-prompt" onClick={()=>setComposer("announcement")}><span><Pencil size={17}/></span>Post an update</button><button className="en-outline-button" onClick={()=>setComposer("material")}><FileUp size={16}/>Material</button></div>}

      <section className="en-stream-panel overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <AlertCircle
                size={36}
                className="mx-auto text-destructive"
              />

              <h3 className="mt-3 font-bold text-destructive">
                Unable to load stream
              </h3>

              <p className="mt-2 text-sm text-destructive">
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
                          ? "border-amber-300 bg-secondary/60"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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

                        {canManage&&<DropdownMenu><DropdownMenuTrigger className="en-icon-button" aria-label={`Post options for ${post.title||"announcement"}`} disabled={isBusy}><MoreHorizontal size={20}/></DropdownMenuTrigger><DropdownMenuContent align="end" className="en-action-menu w-44"><DropdownMenuItem onClick={()=>togglePinMutation.mutate(post)}>{post.is_pinned?<PinOff/>:<Pin/>}{post.is_pinned?"Unpin post":"Pin post"}</DropdownMenuItem>{post.post_type==="announcement"&&<DropdownMenuItem onClick={()=>beginEditing(post)}><Pencil/>Edit post</DropdownMenuItem>}<DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onClick={()=>removePost(post)}><Trash2/>Delete post</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
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
                              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {getStreamErrorMessage(
                togglePinMutation.error ??
                  deleteMutation.error
              )}
            </div>
          )}

          {!streamQuery.isPending &&
            !streamQuery.isError && (page>1||canGoNext) && (
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


function StreamLoading(){return <ContentSkeleton rows={3}/>;}
