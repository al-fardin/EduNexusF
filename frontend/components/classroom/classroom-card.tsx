"use client";
import Link from "next/link";
import { Archive, ArrowUpRight, BookOpen, Copy, Info, LoaderCircle, LogOut, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { type Classroom } from "@/services/classroom";
import { copyText } from "@/lib/clipboard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ClassroomDetailsDialog } from "@/components/classroom/classroom-header";

export function ClassroomCard({ classroom, kind, busy = false, onArchive, onDelete, onLeave }: {
  classroom: Classroom; kind: "teacher" | "student"; busy?: boolean;
  onArchive?: () => void; onDelete?: () => void; onLeave?: () => void;
}) {
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return <article className="en-workspace-class-card">
    <Link className="en-workspace-class-link" href={`/${kind === "teacher" ? "instructor" : "student"}/classrooms/${classroom.id}`} aria-label={`Open ${classroom.name}`}>
      <div className="en-workspace-class-symbol" aria-hidden="true"><BookOpen size={22}/></div>
      <h2>{classroom.name}</h2>
      <p>{[classroom.subject, classroom.section].filter(Boolean).join(" · ") || "Classroom"}</p>
      <div className="en-workspace-class-footer"><span>{classroom.status === "archived" ? "Archived" : kind === "teacher" ? "Teaching" : "Learning"}</span><ArrowUpRight size={17} aria-hidden="true"/></div>
    </Link>
    <div className="en-workspace-class-menu"><DropdownMenu>
      <DropdownMenuTrigger className="en-icon-button" aria-label={`More options for ${classroom.name}`} disabled={busy}>{busy ? <LoaderCircle size={19} className="animate-spin"/> : <MoreHorizontal size={21}/>}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="en-action-menu w-52">
        <DropdownMenuItem onClick={() => setDetails(true)}><Info/>Class details</DropdownMenuItem>
        {kind === "teacher" && <DropdownMenuItem onClick={async () => { try { await copyText(classroom.class_code); setCopied(true); setError(""); } catch { setError("Unable to copy class code"); } }}><Copy/>{copied ? "Code copied" : "Copy class code"}</DropdownMenuItem>}
        {onArchive && <DropdownMenuItem onClick={onArchive}>{classroom.status === "archived" ? <RotateCcw/> : <Archive/>}{classroom.status === "archived" ? "Restore class" : "Archive class"}</DropdownMenuItem>}
        {(onDelete || onLeave) && <DropdownMenuSeparator/>}
        {onDelete && <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2/>Delete class</DropdownMenuItem>}
        {onLeave && <DropdownMenuItem variant="destructive" onClick={onLeave}><LogOut/>Leave class</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu></div>
    {error && <p className="px-5 pb-3 text-xs text-destructive" role="alert">{error}</p>}
    <ClassroomDetailsDialog classroom={classroom} open={details} onOpenChange={setDetails}/>
  </article>;
}
