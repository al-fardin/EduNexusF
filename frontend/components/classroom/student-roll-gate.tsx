"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UserRound } from "lucide-react";
import { enrollmentPhase5 } from "@/services/enrollment-phase5";
import { getClassroomErrorMessage } from "@/services/classroom";

export function StudentRollGate({ classroomId, children }: { classroomId: string; children: ReactNode }) {
  const [roll, setRoll] = useState("");
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["student-roll",classroomId], queryFn: () => enrollmentPhase5.myRoll(classroomId), enabled: !!classroomId });
  const mutation = useMutation({ mutationFn: () => enrollmentPhase5.setMyRoll(classroomId,roll.trim()), onSuccess: () => client.invalidateQueries({ queryKey: ["student-roll",classroomId] }) });
  function save(e: FormEvent<HTMLFormElement>){e.preventDefault();mutation.mutate();}
  if(query.isPending) return <div className="mx-auto mt-12 h-48 max-w-2xl animate-pulse rounded-3xl bg-secondary" aria-label="Checking classroom membership"/>;
  if(query.isError) return <p role="alert" className="mx-auto mt-12 max-w-lg rounded-2xl bg-card p-6 text-red-700">{getClassroomErrorMessage(query.error)}</p>;
  if(query.data) return <>{children}</>;
  return <main className="mx-auto mt-12 max-w-xl rounded-3xl border border-border bg-card p-7 shadow-sm">
    <UserRound className="text-primary" size={32}/><h2 className="mt-4 text-2xl font-bold">Complete your student ID</h2>
    <p className="mt-2 text-sm text-muted-foreground">You joined this class before rolls were required. Enter your unique ID / roll to access this classroom.</p>
    <form onSubmit={save} className="mt-5 space-y-3"><label htmlFor="legacy-roll" className="block text-sm font-semibold">Student ID / Roll</label>
      <input id="legacy-roll" required maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_/-]{0,31}" value={roll} onChange={e=>setRoll(e.target.value)} placeholder="08" className="w-full rounded-xl border border-border bg-background p-3"/>
      {mutation.isError && <p role="alert" className="text-sm text-red-700">{getClassroomErrorMessage(mutation.error)}</p>}
      <button disabled={mutation.isPending} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{mutation.isPending&&<LoaderCircle size={17} className="animate-spin"/>} Save student ID</button>
    </form>
  </main>;
}
