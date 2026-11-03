"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { workspace } from "@/services/workspace";
import { useAuthStore } from "@/store/auth-store";
import { MaterialDownloadButton } from "@/components/classroom/material-library";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";
export function WorkspaceFiles() {
  const user = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["workspace-files", user],
    queryFn: workspace.files,
  });
  const files = (query.data ?? []).filter((f) =>
    `${f.title} ${f.classroom_name} ${f.file_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="en-workspace-page">
      <div className="en-workspace-container">
        <header className="en-page-heading">
          <h1>Files</h1>
          <label className="en-search-field">
            <Search size={18} />
            <input
              aria-label="Search files"
              placeholder="Search files or classes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </header>
        {query.isPending ? (
          <ContentSkeleton />
        ) : query.isError ? (
          <p role="alert" className="text-destructive">
            {examError(query.error)}
          </p>
        ) : files.length === 0 ? (
          <div className="en-workspace-empty">
            {search
              ? "No matching files."
              : "Files shared in your classes will appear here."}
          </div>
        ) : (
          <section className="en-files-list">
            {files.map((file) => (
              <article key={file.id}>
                <span className="en-activity-icon">
                  <FileText size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2>{file.title}</h2>
                  <p>
                    {file.classroom_name} · {file.file_name}
                  </p>
                  <small>
                    {(file.file_size / 1024).toFixed(0)} KB ·{" "}
                    {new Date(file.created_at).toLocaleDateString()}
                  </small>
                </div>
                <MaterialDownloadButton
                  classroomId={file.classroom_id}
                  materialId={file.id}
                  filename={file.file_name}
                  label="Download"
                />
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
