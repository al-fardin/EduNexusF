"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ClassroomCard } from "@/components/classroom/classroom-card";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { classroomService, getClassroomErrorMessage, type Classroom } from "@/services/classroom";

export function ClassroomCollection({kind}:{kind:"teacher"|"student"}) {
  return <AuthGuard><Collection kind={kind}/></AuthGuard>;
}
function Collection({kind}:{kind:"teacher"|"student"}) {
  const [page,setPage]=useState(1);
  const client=useQueryClient();
  const category=kind==="teacher"?"mine":"joined";
  const query=useQuery({queryKey:["classrooms",category,page,12],queryFn:()=>kind==="teacher"?classroomService.listMine(page,12):classroomService.listJoined(page,12)});
  const refresh=async()=>{await client.invalidateQueries({queryKey:["classrooms"]});if(page>1&&(query.data?.items.length??0)<=1)setPage(p=>p-1)};
  const action=useMutation({mutationFn:async ({type,classroom}:{type:"archive"|"delete"|"leave";classroom:Classroom})=>{await (type==="delete"?classroomService.remove(classroom.id):type==="leave"?classroomService.leave(classroom.id):classroom.status==="archived"?classroomService.unarchive(classroom.id):classroomService.archive(classroom.id));},onSuccess:refresh});
  function remove(classroom:Classroom,type:"delete"|"leave") {if(window.confirm(type==="delete"?`Delete "${classroom.name}"? The class will be hidden from its members.`:`Leave "${classroom.name}"? Your previous submissions will be retained.`))action.mutate({type,classroom})}
  const classes=query.data?.items??[];
  return <main className="en-workspace-page"><div className="en-workspace-container"><header className="en-page-heading"><div><h1>{kind==="teacher"?"Teaching classes":"Joined classes"}</h1><p>{kind==="teacher"?"Classes you manage":"Your learning spaces"}</p></div><Link className="en-solid-button" href={kind==="teacher"?"/instructor/classrooms/create":"/student/classrooms/join"}><Plus size={18}/>{kind==="teacher"?"Create class":"Join class"}</Link></header>
    {query.isPending?<ContentSkeleton rows={3}/>:query.isError?<div className="en-workspace-empty" role="alert"><p>{getClassroomErrorMessage(query.error)}</p><button className="en-outline-button mt-4" onClick={()=>void query.refetch()}>Try again</button></div>:classes.length?<div className="en-workspace-class-grid">{classes.map(classroom=><ClassroomCard key={classroom.id} classroom={classroom} kind={kind} busy={action.isPending&&action.variables.classroom.id===classroom.id} onArchive={kind==="teacher"?()=>action.mutate({type:"archive",classroom}):undefined} onDelete={kind==="teacher"?()=>remove(classroom,"delete"):undefined} onLeave={kind==="student"?()=>remove(classroom,"leave"):undefined}/>)}</div>:<div className="en-workspace-empty"><h2>No classes yet</h2><p>{kind==="teacher"?"Create a class to get started.":"Join a class using your teacher’s code."}</p></div>}
    {action.isError&&<p className="mt-4 text-sm text-destructive" role="alert">{getClassroomErrorMessage(action.error)}</p>}
    {!query.isPending&&(page>1||classes.length===12)&&<nav aria-label="Class pages" className="en-pagination"><button className="en-outline-button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button className="en-outline-button" disabled={classes.length<12} onClick={()=>setPage(p=>p+1)}>Next</button></nav>}
  </div></main>;
}
