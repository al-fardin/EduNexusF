"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Plus, Settings2, Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { topics } from "@/services/topics";
import { useAuthStore } from "@/store/auth-store";
import { examError } from "@/services/exams";
export function useTopics(classId: string) {
  const user = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["classwork-topics", user, classId],
    queryFn: () => topics.list(classId),
  });
}
export function matchesTopic(
  links: Record<string, string> | undefined,
  selected: string | undefined,
  kind: string,
  id: string,
) {
  const topic = links?.[`${kind}:${id}`];
  return !selected || (selected === "unfiled" ? !topic : topic === selected);
}
export function ClassworkTopics({
  classId,
  canManage,
  selected,
  onSelect,
}: {
  classId: string;
  canManage: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const query = useTopics(classId);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await client.invalidateQueries({ queryKey: ["classwork-topics"] });
      setTitle("");
      setEditing("");
      setRemove(null);
    } catch (e) {
      setError(examError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="en-topic-toolbar">
        <label>
          <Folder size={18} />
          <select
            aria-label="Filter classwork by topic"
            value={selected}
            disabled={query.isPending}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">All topics</option>
            <option value="unfiled">Unsorted</option>
            {query.data?.items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        {canManage && (
          <button className="en-outline-button" onClick={() => setOpen(true)}>
            <Settings2 size={16} />
            Topics
          </button>
        )}
      </div>
      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {examError(query.error)}
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="en-topic-dialog">
          <DialogHeader>
            <DialogTitle>Classwork topics</DialogTitle>
            <DialogDescription>
              Group materials and assignments. Removing a topic keeps its
              classwork in Unsorted.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void save(() =>
                topics.save(classId, title.trim(), editing || undefined),
              );
            }}
          >
            <input
              className="en-message-edit-input"
              aria-label="Topic title"
              placeholder="Topic name"
              value={title}
              maxLength={80}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              className="en-solid-button"
              aria-label={editing ? "Save topic" : "Add topic"}
              disabled={busy || !title.trim()}
            >
              {editing ? "Save" : <Plus size={18} />}
            </button>
          </form>
          {editing && (
            <button
              className="en-outline-button"
              disabled={busy}
              onClick={() => {
                setEditing("");
                setTitle("");
              }}
            >
              Cancel rename
            </button>
          )}
          <div className="en-topic-manager-list">
            {query.data?.items.map((t) => (
              <article key={t.id}>
                <Folder size={18} />
                <span>{t.title}</span>
                <button
                  className="en-icon-button"
                  aria-label={`Rename ${t.title}`}
                  disabled={busy}
                  onClick={() => {
                    setEditing(t.id);
                    setTitle(t.title);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="en-icon-button"
                  aria-label={`Remove topic ${t.title}`}
                  disabled={busy}
                  onClick={() => setRemove(t.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
          {remove && (
            <div className="en-topic-remove">
              <p>
                Remove this topic? Its assignments and materials will stay in
                the class.
              </p>
              <div className="flex gap-2">
                <button
                  className="en-outline-button"
                  disabled={busy}
                  onClick={() => setRemove(null)}
                >
                  Cancel
                </button>
                <button
                  className="en-solid-button"
                  disabled={busy}
                  onClick={() =>
                    void save(async () => {
                      await topics.remove(classId, remove);
                      if (selected === remove) onSelect("");
                    })
                  }
                >
                  Remove topic
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ResourceTopicPicker({
  classId,
  kind,
  id,
}: {
  classId: string;
  kind: "assignment" | "material";
  id: string;
}) {
  const query = useTopics(classId);
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="en-resource-topic">
      <label>
        <Folder size={14} />
        <select
          aria-label="Move classwork to topic"
          disabled={busy || query.isPending}
          value={query.data?.links[`${kind}:${id}`] ?? ""}
          onChange={async (e) => {
            setBusy(true);
            setError("");
            try {
              await topics.move(classId, kind, id, e.target.value);
              await client.invalidateQueries({
                queryKey: ["classwork-topics"],
              });
            } catch (err) {
              setError(examError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <option value="">Unsorted</option>
          {query.data?.items.map((t) => (
            <option value={t.id} key={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
