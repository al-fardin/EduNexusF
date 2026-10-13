"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, GraduationCap, KeyRound, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { enrollmentPhase5, type CourseLookup } from "@/services/enrollment-phase5";
import { getClassroomErrorMessage } from "@/services/classroom";

export default function JoinClassroomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [roll, setRoll] = useState("");
  const [matched, setMatched] = useState<CourseLookup | null>(null);
  const lookup = useMutation({ mutationFn: enrollmentPhase5.lookup, onSuccess: (data) => setMatched(data) });
  const join = useMutation({ mutationFn: (value: { code: string; roll: string }) => enrollmentPhase5.join(value.code, value.roll), onSuccess: (data) => router.push(`/student/classrooms/${data.classroom.id}`) });
  const normalizedCode = code.replace(/\s/g, "").toUpperCase();
  const normalizedRoll = roll.trim().toUpperCase();

  function checkCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatched(null);
    lookup.mutate(normalizedCode);
  }
  function joinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matched) return;
    join.mutate({ code: normalizedCode, roll: normalizedRoll });
  }
  return <AuthGuard><main className="min-h-screen bg-background px-4 py-10 text-foreground">
    <div className="mx-auto max-w-xl">
      <Link href="/student/classrooms" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={17}/> My classes</Link>
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <header className="bg-primary p-7 text-white sm:p-9"><GraduationCap size={30}/><h1 className="mt-4 text-3xl font-bold">Join a classroom</h1><p className="mt-2 text-sm opacity-80">Verify the class code, then claim your unique Student ID / Roll.</p></header>
        <div className="space-y-5 p-6 sm:p-9">
          <form onSubmit={checkCode} className="space-y-3">
            <label htmlFor="course-code" className="block text-sm font-semibold">Step 1 — Class code</label>
            <div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17}/>
              <input id="course-code" required minLength={6} maxLength={8} value={code} onChange={(e) => {setCode(e.target.value.toUpperCase().replace(/\s/g, ""));setMatched(null);join.reset();}} placeholder="AB1234" className="w-full rounded-xl border border-border bg-background p-3 pl-12 font-semibold uppercase tracking-widest outline-none focus:border-primary"/>
            </div>
            <button type="submit" disabled={normalizedCode.length<6 || lookup.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {lookup.isPending?<LoaderCircle size={16} className="animate-spin"/>:<ShieldCheck size={16}/>} Verify class code
            </button>
            {lookup.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{getClassroomErrorMessage(lookup.error)}</p>}
          </form>
          {matched && <form onSubmit={joinClass} className="space-y-4 rounded-2xl border border-border bg-secondary p-5">
            <div className="flex gap-3"><CheckCircle2 className="shrink-0 text-green-700" size={22}/><div><p className="font-bold">{matched.name}</p><p className="text-xs text-muted-foreground">{matched.course_code || "Course code not assigned"}{matched.section ? ` · ${matched.section}` : ""}</p></div></div>
            <div><label htmlFor="student-roll" className="mb-2 block text-sm font-semibold">Step 2 — Your Student ID / Roll <span className="text-red-700">*</span></label>
              <div className="relative"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17}/>
                <input id="student-roll" autoFocus required minLength={1} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_/-]{0,31}" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="08" autoComplete="off" className="w-full rounded-xl border border-border bg-card p-3 pl-12 font-semibold outline-none focus:border-primary"/>
              </div><p className="mt-2 text-xs text-muted-foreground">Example: 08. A roll must be unique within this classroom. Another classroom may use the same roll.</p>
            </div>
            {join.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{getClassroomErrorMessage(join.error)}</p>}
            <button type="submit" disabled={join.isPending || !normalizedRoll} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3.5 font-semibold text-white disabled:opacity-50">{join.isPending?<LoaderCircle size={18} className="animate-spin"/>:<GraduationCap size={18}/>} {join.isPending?"Joining...":"Confirm & join classroom"}</button>
          </form>}
        </div>
      </section>
    </div>
  </main></AuthGuard>;
}
