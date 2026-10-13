"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenText, CheckCircle2, ChevronRight, CirclePlus, DoorOpen, GraduationCap, LogOut, Mail, MapPin, School, Settings2, Sparkles } from "lucide-react";
import axios from "axios";
import { AuthGuard } from "@/components/auth/auth-guard";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { authService } from "@/services/auth";
import { Classroom, classroomService } from "@/services/classroom";
import { AuthUser, useAuthStore } from "@/store/auth-store";

export default function Dashboard() {
  return <AuthGuard><DashboardHome /></AuthGuard>;
}

function DashboardHome() {
  const router=useRouter();
  const storeUser=useAuthStore(s=>s.user);
  const setUser=useAuthStore(s=>s.setUser);
  const logOutStore=useAuthStore(s=>s.logout);
  const [user,setLocalUser]=useState<AuthUser | null>(storeUser);
  const [loadingProfile,setLoadingProfile]=useState(!storeUser);
  const [profileError,setProfileError]=useState("");
  const [loggingOut,setLoggingOut]=useState(false);
  const owned=useQuery({queryKey:["classrooms","mine",1,6],queryFn:()=>classroomService.listMine(1,6),retry:1});
  const joined=useQuery({queryKey:["classrooms","joined",1,6],queryFn:()=>classroomService.listJoined(1,6),retry:1});

  useEffect(()=>{
    let active=true;
    authService.me().then(response=>{
      if(!active)return;
      const result=response.data as AuthUser;
      setLocalUser(result);setUser(result);
    }).catch((error:unknown)=>{
      if(!active)return;
      if(axios.isAxiosError(error) && error.response?.status===401){
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("refresh_token");
        logOutStore();router.replace("/login");
        return;
      }
      setProfileError("Unable to refresh your account details.");
    }).finally(()=>{if(active)setLoadingProfile(false)});
    return ()=>{active=false;};
  },[logOutStore,router,setUser]);

  async function signOut(){
    setLoggingOut(true);
    try{const token=window.localStorage.getItem("refresh_token");if(token)await authService.logout(token)}
    catch(error){console.warn("Sign-out request could not reach the API",error)}
    finally{window.localStorage.removeItem("access_token");window.localStorage.removeItem("refresh_token");logOutStore();router.replace("/login")}
  }
  const teachingClasses=owned.data?.items ?? [];
  const learningClasses=joined.data?.items ?? [];
  const name=user?.first_name?.trim() || "there";
  return <main className="min-h-screen bg-transparent px-4 pb-14 pt-9 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="en-dot"/><span className="en-label">YOUR SPACE / DASHBOARD</span></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/settings" className="en-btn en-btn-light"><Settings2 size={16}/> Settings</Link>
          <button type="button" className="en-btn en-btn-light" disabled={loggingOut} onClick={()=>void signOut()}><LogOut size={16}/> {loggingOut?"Signing out…":"Sign out"}</button>
        </div>
      </div>
      <section className="en-hero px-7 py-9 sm:px-10 sm:py-12">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_.7fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b6c1b2]/60 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#dfe4d9]"><Sparkles size={14}/> MADE FOR TEACHING & LEARNING</span>
            <h1 className="mt-5 max-w-[660px] text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl" style={{fontFamily:"ui-monospace, Menlo, Consolas, monospace",letterSpacing:"-.06em"}}>Welcome back,<br/><span className="text-[#cbd2c5]">{name}.</span></h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#cbd2c5]">Your classes, conversations and learning moments — all together in one cozy corner of the internet.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/instructor/classrooms/create" className="en-btn en-btn-light"><CirclePlus size={17}/> Create a class <ArrowRight size={16}/></Link>
              <Link href="/student/classrooms/join" className="en-btn border-[#cbd2c5] bg-transparent text-[#e9ede5]"><DoorOpen size={17}/> Join a class <ArrowRight size={16}/></Link>
            </div>
          </div>
          <div className="rounded-[24px] border border-dashed border-[#8a9588] bg-[#f3f1ea]/10 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#cbd2c5]">Your classroom overview</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[19px] bg-[#f4f4ea] p-4 text-[#202620]"><School size={21} color="#536058"/><div className="mt-4 text-3xl font-black">{owned.isPending?"—":teachingClasses.length}</div><div className="text-xs text-[#6f756f]">Created classes</div></div>
              <div className="rounded-[19px] bg-[#f4f4ea] p-4 text-[#202620]"><GraduationCap size={21} color="#536058"/><div className="mt-4 text-3xl font-black">{joined.isPending?"—":learningClasses.length}</div><div className="text-xs text-[#6f756f]">Joined classes</div></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#cbd2c5]">These counts show classes returned on the first page, not lifetime totals.</p>
          </div>
        </div>
      </section>

      {!user?.email_verified && user && <EmailVerificationBanner email={user.email}/>}
      {profileError && <div role="alert" className="rounded-xl border border-[#ffd0d0] bg-[#fff0ef] p-4 text-sm text-[#b34450]">{profileError}</div>}

      <section className="space-y-4" aria-label="Created classes">
        <SectionHeading eyebrow="01 / LEAD THE WAY" title="Classes you created" description="Your teaching spaces, ready when you are." link="/instructor/classrooms" linkLabel="View created classes"/>
        <ClassList classes={teachingClasses} loading={owned.isPending} failed={owned.isError} kind="teacher"/>
      </section>
      <section className="space-y-4" aria-label="Joined classes">
        <SectionHeading eyebrow="02 / KEEP EXPLORING" title="Classes you joined" description="Pick up right where you left off." link="/student/classrooms" linkLabel="View joined classes"/>
        <ClassList classes={learningClasses} loading={joined.isPending} failed={joined.isError} kind="student"/>
      </section>

      <section className="en-ticket-card p-6 sm:p-8" aria-label="Account snapshot">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="en-label">03 / YOUR PROFILE</p><h2 className="en-section-title mt-2">Account snapshot</h2></div><Link href="/settings" className="en-btn en-btn-light"><Settings2 size={16}/> Manage profile</Link></div>
        {loadingProfile&&!user ? <div className="mt-6 h-24 animate-pulse rounded-xl bg-accent"/> : user ?
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="en-inner-paper"><p className="en-label">Name</p><p className="mt-2 font-bold">{user.first_name} {user.last_name}</p><p className="mt-1 text-xs en-muted">@{user.username}</p></div>
          <div className="en-inner-paper"><p className="en-label">Email</p><p className="mt-2 break-words font-bold text-sm">{user.email}</p><span className="mt-2 inline-flex items-center gap-1 text-xs" style={{color:user.email_verified?"#5f7358":"#a96508"}}>{user.email_verified?<CheckCircle2 size={13}/>:<Mail size={13}/>} {user.email_verified?"Verified":"Verification pending"}</span></div>
          <div className="en-inner-paper"><p className="en-label">Account status</p><p className="mt-2 font-bold capitalize">{user.status}</p><p className="mt-1 text-xs en-muted">Your role depends on each classroom.</p></div>
        </div>:<p className="mt-5 text-sm en-muted">Profile information is unavailable.</p>}
      </section>
    </div>
  </main>;
}

function SectionHeading({eyebrow,title,description,link,linkLabel}:{eyebrow:string;title:string;description:string;link:string;linkLabel:string}) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="en-label">{eyebrow}</p><h2 className="en-section-title mt-2">{title}</h2><p className="mt-1 text-sm en-muted">{description}</p></div><Link href={link} className="inline-flex items-center gap-2 text-sm font-semibold text-[#2b342c] hover:underline">{linkLabel}<ArrowRight size={16}/></Link></div>;
}

function ClassList({classes,loading,failed,kind}:{classes:Classroom[];loading:boolean;failed:boolean;kind:"teacher"|"student"}) {
  if(loading)return <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-52 animate-pulse rounded-3xl bg-[#cbd2c5]"/>)}</div>;
  if(failed)return <div className="en-empty"><p className="font-semibold">Could not load these classes.</p><p className="mt-2 text-sm en-muted">The connected backend may be offline or this action may not yet be enabled for your account.</p></div>;
  if(!classes.length)return <div className="en-empty"><BookOpenText size={29} className="mx-auto text-[#536058]"/><p className="mt-3 font-semibold">{kind==="teacher"?"No created classes yet":"No joined classes yet"}</p><p className="mt-2 text-sm en-muted">{kind==="teacher"?"Start a space for the people you teach.":"Have a class code? You can join in seconds."}</p><Link href={kind==="teacher"?"/instructor/classrooms/create":"/student/classrooms/join"} className="en-btn en-btn-dark mt-5">{kind==="teacher"?"Create class":"Join class"}<ArrowRight size={16}/></Link></div>;
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{classes.map((classroom,index)=><Link key={classroom.id} href={`${kind==="teacher"?"/instructor":"/student"}/classrooms/${classroom.id}`} className="en-ticket-card group block transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
    <div className="en-class-strip" style={{filter:index%3===1?"hue-rotate(-12deg)":index%3===2?"hue-rotate(12deg)":undefined}}/>
    <div className="p-6"><div className="flex justify-between gap-3"><span className="en-tag">{kind==="teacher"?"Created by you":"Joined class"}</span><ArrowRight size={19} className="text-[#536058] transition-transform group-hover:translate-x-1"/></div>
    <div className="mt-7 flex size-12 items-center justify-center rounded-[17px] bg-[#e9ede5] text-[#45554a]"><BookOpenText size={24}/></div>
    <h3 className="mt-4 line-clamp-2 text-lg font-extrabold">{classroom.name}</h3><p className="mt-1 line-clamp-1 text-sm en-muted">{classroom.subject||classroom.section||"Your classroom"}</p>
    <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#cbd2c5] pt-4 text-xs en-muted"><span className="flex items-center gap-1"><MapPin size={13}/>{classroom.room||"Online"}</span><span className="inline-flex items-center gap-1 font-semibold">Open <ChevronRight size={14}/></span></div>
    </div></Link>)}</div>;
}
