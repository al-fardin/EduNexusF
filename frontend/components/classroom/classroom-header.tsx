"use client";
import Link from "next/link";
import {MessagingLink} from "@/components/layout/messaging-link";
import { ArrowLeft, Check, Copy, Info, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classroomService, getClassroomErrorMessage, type Classroom } from "@/services/classroom";
import { copyText } from "@/lib/clipboard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ClassroomDetailsDialog({ classroom, open, onOpenChange }: { classroom: Classroom; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const details = useQuery({ queryKey: ["classroom-details", classroom.id], queryFn: () => classroomService.details(classroom.id), enabled: open });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="en-class-details max-h-[85dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{classroom.name}</DialogTitle><DialogDescription>Class details</DialogDescription></DialogHeader>
    <dl className="en-details-list">{[["Subject",classroom.subject],["Section",classroom.section],["Room",classroom.room],["About",classroom.description]].filter(([,value])=>Boolean(value)).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      <div><dt>Class code</dt><dd className="flex items-center justify-between gap-3"><code className="font-semibold tracking-widest">{classroom.class_code}</code><button type="button" className="en-icon-button" aria-label="Copy class code" onClick={async()=>{try{await copyText(classroom.class_code);setCopied(true);setError("")}catch{setError("Unable to copy class code")}}}>{copied?<Check size={17}/>:<Copy size={17}/>}</button></dd></div>
      <div><dt>Teachers</dt><dd>{details.isPending ? <span className="en-skeleton block h-4 w-32 rounded"/> : details.isError ? <span role="alert" className="text-destructive text-sm">{getClassroomErrorMessage(details.error)}</span> : details.data?.teachers.map(t=><p key={t.id}>{t.name}</p>)}</dd></div>
    </dl>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}

export function ClassroomHeader({ classroom, kind }: { classroom: Classroom; kind: "teacher" | "student" }) {
  const [details, setDetails] = useState(false);
  return <><header className="en-classroom-heading">
    <Link className="en-icon-button" href={kind==="teacher"?"/instructor/classrooms":"/student/classrooms"} aria-label="Back to classes"><ArrowLeft size={20}/></Link>
    <div className="min-w-0 flex-1"><h1>{classroom.name}</h1>{classroom.subject&&<p>{classroom.subject}{classroom.section ? ` · ${classroom.section}` : ""}</p>}</div>
    <MessagingLink classroomId={classroom.id}/><DropdownMenu><DropdownMenuTrigger className="en-icon-button" aria-label="Classroom options"><MoreHorizontal size={22}/></DropdownMenuTrigger><DropdownMenuContent align="end" className="en-action-menu w-52"><DropdownMenuItem onClick={()=>setDetails(true)}><Info/>Class & teacher details</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </header><ClassroomDetailsDialog classroom={classroom} open={details} onOpenChange={setDetails}/></>;
}
