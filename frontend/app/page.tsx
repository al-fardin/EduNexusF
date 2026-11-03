"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ClassroomCard } from "@/components/classroom/classroom-card";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { classroomService } from "@/services/classroom";

export default function Home(){return <AuthGuard><Workspace/></AuthGuard>}
function Workspace(){
 const [filter,setFilter]=useState<"all"|"teacher"|"student">("all");
 const owned=useQuery({queryKey:["classrooms","mine",1,6],queryFn:()=>classroomService.listMine(1,6)});
 const joined=useQuery({queryKey:["classrooms","joined",1,6],queryFn:()=>classroomService.listJoined(1,6)});
 const entries=[...(filter!=="student"?(owned.data?.items??[]).map(classroom=>({classroom,kind:"teacher" as const})):[]),...(filter!=="teacher"?(joined.data?.items??[]).map(classroom=>({classroom,kind:"student" as const})):[])];
 const loading=(filter!=="student"&&owned.isPending)||(filter!=="teacher"&&joined.isPending);
 const error=(filter!=="student"&&owned.isError)||(filter!=="teacher"&&joined.isError);
 return <main className="en-workspace-page"><div className="en-workspace-container">
  <header className="en-page-heading"><div><h1>Home</h1><p>Your classes and coursework.</p></div><div className="flex gap-2"><Link className="en-outline-button" href="/student/classrooms/join">Join class</Link><Link className="en-solid-button" href="/instructor/classrooms/create"><Plus size={17}/>Create class</Link></div></header>
  <section aria-label="Your classes"><div className="en-section-toolbar"><h2>Your classes</h2><div className="en-filter-tabs" aria-label="Filter classes">{([['all','All'],['teacher','Teaching'],['student','Learning']] as const).map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
   {error&&<p role="alert" className="mb-4 text-sm text-destructive">Some classes could not be loaded. <button className="underline" onClick={()=>{void owned.refetch();void joined.refetch()}}>Retry</button></p>}
   {loading?<ContentSkeleton rows={2}/>:entries.length?<div className="en-workspace-class-grid">{entries.map(({classroom,kind})=><ClassroomCard key={`${kind}-${classroom.id}`} classroom={classroom} kind={kind}/>)}</div>:!error&&<div className="en-workspace-empty"><h3>No classes yet</h3><p>Create a class or join using a class code.</p></div>}
  </section>
  <div className="en-workspace-links"><Link href="/instructor/classrooms">All teaching classes<ArrowRight size={16}/></Link><Link href="/student/classrooms">All joined classes<ArrowRight size={16}/></Link></div>
 </div></main>;
}
