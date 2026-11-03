"use client";
import Link from "next/link";
import {
  Archive,
  Copy,
  Info,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CourseCover } from "@/components/classroom/course-cover";
import { classroomService } from "@/services/classroom";
import { useState } from "react";
import { type Classroom } from "@/services/classroom";
import { copyText } from "@/lib/clipboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClassroomDetailsDialog } from "@/components/classroom/classroom-header";

export function ClassroomCard({
  classroom,
  kind,
  busy = false,
  onArchive,
  onDelete,
  onLeave,
}: {
  classroom: Classroom;
  kind: "teacher" | "student";
  busy?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}) {
  const teacher = useQuery({
    queryKey: ["classroom-details", classroom.id],
    queryFn: () => classroomService.details(classroom.id),
    enabled: !classroom.teacher_name,
    staleTime: 60000,
  });
  const teacherName =
    classroom.teacher_name ||
    teacher.data?.teachers.map((t) => t.name).join(", ") ||
    "Class teacher";
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <article className="en-workspace-class-card">
      <Link
        className="en-workspace-class-link"
        href={`/${kind === "teacher" ? "instructor" : "student"}/classrooms/${classroom.id}`}
        aria-label={`Open ${classroom.name}`}
      >
        <CourseCover id={classroom.id} />
        <div className="en-course-card-body">
          <h2>{classroom.name}</h2>
          <p>
            {[classroom.subject, classroom.section]
              .filter(Boolean)
              .join(" · ") || "Classroom"}
          </p>
          <div className="en-workspace-class-footer">
            <span className="en-avatar en-avatar-sm">
              {teacherName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>{teacherName}</span>
            {classroom.status === "archived" && <small>Archived</small>}
          </div>
        </div>
      </Link>
      <div className="en-workspace-class-menu">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="en-icon-button"
            aria-label={`More options for ${classroom.name}`}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <MoreHorizontal size={21} />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="en-action-menu w-52">
            <DropdownMenuItem onClick={() => setDetails(true)}>
              <Info />
              Class details
            </DropdownMenuItem>
            {kind === "teacher" && (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await copyText(classroom.class_code);
                    setCopied(true);
                    setError("");
                  } catch {
                    setError("Unable to copy class code");
                  }
                }}
              >
                <Copy />
                {copied ? "Code copied" : "Copy class code"}
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                {classroom.status === "archived" ? <RotateCcw /> : <Archive />}
                {classroom.status === "archived"
                  ? "Restore class"
                  : "Archive class"}
              </DropdownMenuItem>
            )}
            {(onDelete || onLeave) && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                Delete class
              </DropdownMenuItem>
            )}
            {onLeave && (
              <DropdownMenuItem variant="destructive" onClick={onLeave}>
                <LogOut />
                Leave class
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && (
        <p className="px-5 pb-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <ClassroomDetailsDialog
        classroom={classroom}
        open={details}
        onOpenChange={setDetails}
      />
    </article>
  );
}
