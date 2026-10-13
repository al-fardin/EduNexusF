"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarDays, ChevronRight, CirclePlus, ClipboardCheck, Code2, DoorOpen, FileText, Megaphone, MessageSquareText, School, Sparkles, Users } from "lucide-react";

const mockClasses=[
 {name:"Data Structures & Algorithms",code:"CSE 220",subject:"Computer Science",room:"Lab 402",kind:"TEACHING SPACE"},
 {name:"Database Management Systems",code:"CSE 234",subject:"Database Systems",room:"Room 303",kind:"JOINED CLASS"},
 {name:"Software Engineering",code:"CSE 330",subject:"Engineering",room:"Seminar Room",kind:"JOINED CLASS"},
];
type Tab="stream"|"materials"|"exams"|"people";
const tabData:[Tab,string,React.ElementType][]=[
 ["stream","Stream",Megaphone],["materials","Classwork",BookOpenText],["exams","Exams",ClipboardCheck],["people","People",Users]
];

export default function PreviewPage(){
 const [tab,setTab]=useState<Tab>("stream");
 return <main className="bg-transparent px-4 pb-16 pt-8 sm:px-6 lg:px-8">
  <div className="mx-auto max-w-6xl space-y-9">
   <div className="flex flex-wrap items-center justify-between gap-3"><p className="en-label"><span className="en-dot mr-3"/>EDUNEXUS / DESIGN PREVIEW</p><span className="en-tag">UI SAMPLE · NO LIVE DATA</span></div>
   <section className="en-hero px-7 py-10 sm:px-12 sm:py-14">
    <div className="grid gap-9 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
     <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#a96508] px-3 py-1.5 text-xs text-[#f8e8cf]"><Sparkles size={14}/> YOUR LEARNING, YOUR SPACE</p>
      <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-[57px]" style={{fontFamily:"ui-monospace, Menlo, monospace",letterSpacing:"-.065em"}}>A classroom that<br/><span className="text-[#cbd2c5]">feels like yours.</span></h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#dfe4d9]">Create a space to teach. Join one to learn. Everything from announcements to your class materials stays beautifully organised.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/register" className="en-btn en-btn-light"><CirclePlus size={16}/> Get started <ArrowRight size={16}/></Link><Link href="/login" className="en-btn border-[#b6c1b2] bg-transparent text-[#e9ede5]"><DoorOpen size={16}/> Sign in</Link></div>
     </div>
     <div className="rounded-[31px] border border-dashed border-[#8a9588] p-4 sm:p-5">
      <div className="relative rounded-[24px] bg-[#e9ede5] p-6 text-[#171b18]">
       <div className="flex items-center justify-between"><span className="en-label">AT A GLANCE</span><span className="en-tag"><span className="en-dot"/> ON TRACK</span></div>
       <h3 className="mt-7 text-lg font-bold">Make room for learning.</h3>
       <div className="mt-5 grid grid-cols-2 gap-3"><div className="en-inner-paper"><School size={20} color="#536058"/><div className="mt-3 text-3xl font-black">03</div><p className="text-xs en-muted">Classrooms</p></div><div className="en-inner-paper"><MessageSquareText size={20} color="#536058"/><div className="mt-3 text-3xl font-black">05</div><p className="text-xs en-muted">Class updates</p></div></div>
       <p className="mt-5 border-t border-dashed border-[#b6c1b2] pt-4 text-xs en-muted">One account · different roles in each classroom</p>
      </div>
     </div>
    </div>
   </section>
   <section><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="en-label">01 / YOUR CLASSROOMS</p><h2 className="en-section-title mt-2">Made for every kind of learning</h2><p className="mt-1 text-sm en-muted">The same account can create and join classrooms.</p></div><span className="en-tag">SAMPLE CLASSROOMS</span></div>
    <div className="mt-5 grid gap-4 md:grid-cols-3">{mockClasses.map((room,i)=><div key={room.code} className="en-ticket-card group"><div className="en-class-strip" style={{filter:i===1?"hue-rotate(-15deg)":i===2?"hue-rotate(8deg)":undefined}}/><div className="p-6"><div className="flex items-center justify-between"><span className="en-tag">{room.kind}</span><ChevronRight size={20} className="text-[#536058]"/></div><div className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9ede5] text-[#a96508]"><BookOpenText/></div><h3 className="mt-4 min-h-[52px] text-lg font-extrabold leading-snug">{room.name}</h3><p className="mt-2 text-sm en-muted">{room.code} · {room.subject}</p><div className="mt-6 flex justify-between border-t border-dashed border-[#b6c1b2] pt-4 text-xs en-muted"><span>{room.room}</span><span>Class details →</span></div></div></div>)}</div>
   </section>
   <section><div><p className="en-label">02 / CLASSROOM SPACE</p><h2 className="en-section-title mt-2">Where the class comes together</h2><p className="mt-1 text-sm en-muted">A focused interface for announcements, resources and class activity.</p></div>
    <div className="en-ticket-card mt-5 overflow-hidden"><div className="en-class-strip"/><div className="p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="en-tag">CSE 220 · SECTION A</span><h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">Data Structures & Algorithms</h3><p className="mt-2 text-sm en-muted">Department of Computer Science · Fall semester</p></div><div className="en-inner-paper text-center"><p className="en-label">CLASS CODE</p><strong className="mt-1 block font-mono text-xl">DSA7K3</strong></div></div>
     <div className="mt-7 flex flex-wrap gap-2 border-b border-[#cbd2c5] pb-4" role="tablist" aria-label="Preview classroom tabs">
      {tabData.map(([key,label,Icon])=><button key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>setTab(key)} className={`inline-flex items-center gap-2 rounded-[15px] px-4 py-2.5 text-sm font-bold transition ${tab===key?"bg-primary text-white":"bg-[#dfe4d9] text-[#536058] hover:bg-[#dfe4d9]"}`}><Icon size={16}/>{label}</button>)}
     </div>
     <div className="mt-6 min-h-64">{tab==="stream"?<div className="grid gap-4 lg:grid-cols-[.6fr_1.4fr]"><aside className="en-inner-paper self-start"><p className="en-label">UPCOMING</p><div className="mt-4 flex gap-3"><CalendarDays size={20} color="#a96508"/><div><strong className="text-sm">Lab assessment</strong><p className="mt-1 text-xs en-muted">Friday · 10:00 AM</p></div></div><hr className="en-divider my-4"/><p className="text-xs en-muted">A quieter way to keep everyone on the same page.</p></aside><div className="space-y-4"><div className="rounded-2xl border border-[#d9ddd4] bg-[#f3f1ea] p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cbd2c5] font-bold">TR</span><div><p className="font-bold text-sm">Teacher announcement</p><p className="text-xs en-muted">Today · 9:45 AM</p></div><span className="en-tag ml-auto">PINNED</span></div><p className="mt-4 text-sm leading-7">Welcome to our Data Structures classroom! Find weekly notes, class updates and important resources here.</p><div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#e9ede5] px-3 py-2 text-xs font-semibold"><FileText size={16}/> Week_01_Slides.pdf</div></div><div className="rounded-2xl border border-[#d9ddd4] bg-[#f3f1ea] p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfe8d9] font-bold">TR</span><div><p className="font-bold text-sm">Class materials updated</p><p className="text-xs en-muted">Yesterday</p></div></div><p className="mt-3 text-sm en-muted">Lecture 02 practice material is now available.</p></div></div></div>
     :tab==="materials"?<div className="grid gap-3 md:grid-cols-2">{["Week 01 · Course introduction","Week 02 · Linked lists","Lecture notes and practice"].map((v)=><div key={v} className="en-inner-paper flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#cbd2c5]"><FileText size={22}/></span><div><strong className="text-sm">{v}</strong><p className="mt-1 text-xs en-muted">Sample resource · Preview only</p></div></div>)}</div>
     :tab==="exams"?<div className="en-empty"><Code2 className="mx-auto text-[#536058]" size={31}/><h4 className="mt-3 font-bold">Live exams, designed with care</h4><p className="mx-auto mt-2 max-w-md text-sm en-muted">Exam creation, coding assessment, monitoring and grading are planned features. This preview doesn’t simulate a live exam.</p></div>
     :<div className="grid gap-3 md:grid-cols-3">{["Instructor · Teacher","Student A · Member","Student B · Member"].map((v,i)=><div className="en-inner-paper flex items-center gap-3" key={v}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#d6dfcf] font-black">{i===0?"T":i===1?"A":"B"}</span><span className="text-sm font-semibold">{v}</span></div>)}</div>}
     </div>
    </div></div>
   </section>
   <section className="en-ticket-card p-7 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-6"><div><p className="en-label">03 / YOUR NEXT STEP</p><h2 className="en-section-title mt-2">Ready to make it yours?</h2><p className="mt-2 max-w-xl text-sm en-muted">This is a design-only preview. The actual EduNexus pages are connected to your Go API for login, class management, and the existing stream.</p></div><Link href="/login" className="en-btn en-btn-dark">Go to sign in <ArrowRight size={16}/></Link></div></section>
  </div>
 </main>;
}
