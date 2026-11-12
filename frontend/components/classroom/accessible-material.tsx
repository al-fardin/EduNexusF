"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  academicReviews,
  type AccessibleText,
} from "@/services/academic-reviews";
import { materialBlob } from "@/lib/offline-resources";
import { textMatches } from "@/lib/material-text";
import { downloadBlob } from "@/lib/academic-tools";
import { usePreferences } from "@/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { EmptyState, ErrorState } from "@/components/ui/app-feedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { examError } from "@/services/exams";
export function AccessibleMaterial({
  classId,
  id,
  filename,
  canManage = false,
}: {
  classId: string;
  id: string;
  filename: string;
  canManage?: boolean;
}) {
  const { t } = usePreferences(),
    client = useQueryClient();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ["accessible-material", classId, id],
    queryFn: () => academicReviews.accessible(classId, id),
    enabled: open,
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("Text & accessibility")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(false);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{filename}</DialogTitle>
            <DialogDescription>{t("Accessible material")}</DialogDescription>
          </DialogHeader>
          {canManage && (
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {t(editing ? "Read material" : "Edit accessible text")}
            </Button>
          )}
          {query.isPending ? (
            <ContentSkeleton rows={3} />
          ) : query.isError ? (
            <ErrorState
              message={examError(query.error)}
              onRetry={() => void query.refetch()}
            />
          ) : editing ? (
            <AccessibleEditor
              key={query.dataUpdatedAt}
              initial={query.data}
              classId={classId}
              id={id}
              onSaved={() => {
                setEditing(false);
                void client.invalidateQueries({
                  queryKey: ["accessible-material", classId, id],
                });
                void client.invalidateQueries({
                  queryKey: ["materials", classId],
                });
                void client.invalidateQueries({ queryKey: ["global-search"] });
              }}
            />
          ) : (
            <AccessibleReader
              data={query.data}
              classId={classId}
              id={id}
              filename={filename}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function AccessibleEditor({
  initial,
  classId,
  id,
  onSaved,
}: {
  initial: AccessibleText;
  classId: string;
  id: string;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const value = {
          ...initial,
          image_alt: String(form.get("image_alt")),
          caption: String(form.get("caption")),
          plain_text: String(form.get("plain_text")),
          transcript: String(form.get("transcript")),
          captions_vtt: String(form.get("captions_vtt")),
        };
        setBusy(true);
        setError("");
        void academicReviews
          .saveAccessible(classId, id, value)
          .then(onSaved)
          .catch((e) => setError(examError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {error && <ErrorState message={error} />}
      <fieldset disabled={busy} className="space-y-3">
        {[
          ["image_alt", "Image description", 1000, 3],
          ["caption", "Caption", 4000, 3],
          ["plain_text", "Searchable text", 200000, 8],
          ["transcript", "Transcript", 200000, 8],
          ["captions_vtt", "WebVTT captions", 100000, 5],
        ].map(([name, label, max, rows]) => (
          <label key={name} className="grid gap-1 text-sm">
            {t(String(label))}
            <textarea
              name={String(name)}
              maxLength={Number(max)}
              rows={Number(rows)}
              defaultValue={initial[name as keyof AccessibleText] ?? ""}
              className="rounded-xl border border-border bg-card p-3"
            />
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={busy}>
        {t("Save changes")}
      </Button>
    </form>
  );
}
function AccessibleReader({
  data,
  classId,
  id,
  filename,
}: {
  data: AccessibleText;
  classId: string;
  id: string;
  filename: string;
}) {
  const { t } = usePreferences();
  const [search, setSearch] = useState("");
  const sections = [
    ["Image description", data.image_alt],
    ["Caption", data.caption],
    ["Searchable text", data.plain_text],
    ["Transcript", data.transcript],
  ].filter(([, value]) => !!value);
  return (
    <div className="space-y-4">
      {/\.(mp4|webm|mp3|wav|ogg)$/i.test(filename) && (
        <MaterialMedia
          classId={classId}
          id={id}
          filename={filename}
          captions={data.captions_vtt}
        />
      )}
      <label className="grid gap-1 text-sm">
        {t("Find in material")}
        <input
          type="search"
          value={search}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-border bg-card p-3"
        />
      </label>
      {!sections.length ? (
        <EmptyState title={t("No accessible text added yet")} />
      ) : (
        sections.map(([title, value]) => {
          const result = textMatches(value, search);
          return (
            <section key={title} className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{t(title)}</h3>
                {search.trim().length >= 2 && (
                  <span className="text-xs text-muted-foreground">
                    {result.count}
                    {result.capped ? "+" : ""} {t("matches")}
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm">
                {result.parts.map((part, i) =>
                  part.match ? (
                    <mark key={i} className="bg-primary/20 text-foreground">
                      {part.text}
                    </mark>
                  ) : (
                    part.text
                  ),
                )}
              </div>
            </section>
          );
        })
      )}
      {data.captions_vtt && (
        <Button
          variant="outline"
          onClick={() =>
            downloadBlob(
              new Blob([data.captions_vtt], { type: "text/vtt;charset=utf-8" }),
              filename + ".vtt",
            )
          }
        >
          {t("Download captions")}
        </Button>
      )}
    </div>
  );
}
function MaterialMedia({
  classId,
  id,
  filename,
  captions,
}: {
  classId: string;
  id: string;
  filename: string;
  captions: string;
}) {
  const query = useQuery({
    queryKey: ["material-media", classId, id],
    queryFn: ({ signal }) =>
      materialBlob(
        `/classrooms/${classId}/materials/${id}/download`,
        signal,
        filename,
      ),
    staleTime: 60000,
  });
  return query.isPending ? (
    <ContentSkeleton rows={2} />
  ) : query.isError ? (
    <ErrorState message={examError(query.error)} />
  ) : (
    <BlobPlayer blob={query.data} filename={filename} captions={captions} />
  );
}
function BlobPlayer({
  blob,
  filename,
  captions,
}: {
  blob: Blob;
  filename: string;
  captions: string;
}) {
  const video = useRef<HTMLVideoElement>(null),
    audio = useRef<HTMLAudioElement>(null),
    track = useRef<HTMLTrackElement>(null);
  const isVideo = /\.(mp4|webm)$/i.test(filename);
  useEffect(() => {
    const url = URL.createObjectURL(blob),
      captionURL = captions
        ? URL.createObjectURL(new Blob([captions], { type: "text/vtt" }))
        : "";
    const player = video.current ?? audio.current;
    if (player) player.src = url;
    if (track.current && captionURL) track.current.src = captionURL;
    return () => {
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      URL.revokeObjectURL(url);
      if (captionURL) URL.revokeObjectURL(captionURL);
    };
  }, [blob, captions]);
  return isVideo ? (
    <video
      ref={video}
      controls
      playsInline
      preload="metadata"
      className="max-h-96 w-full rounded-xl"
      aria-label={filename}
    >
      {captions && (
        <track
          ref={track}
          kind="captions"
          srcLang="und"
          label="Captions"
          default
        />
      )}
    </video>
  ) : (
    <audio
      ref={audio}
      controls
      preload="metadata"
      className="w-full"
      aria-label={filename}
    />
  );
}
