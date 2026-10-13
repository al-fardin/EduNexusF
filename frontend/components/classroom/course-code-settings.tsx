"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, BookOpen } from "lucide-react";
import { enrollmentPhase5 } from "@/services/enrollment-phase5";
import { examManagement } from "@/services/exam-management";
import { api } from "@/lib/api";
import { getClassroomErrorMessage } from "@/services/classroom";

export function CourseCodeSettings({ classroomId }: { classroomId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const client = useQueryClient();
  const lookup=useQuery({queryKey:["course-code",classroomId],queryFn:()=>enrollmentPhase5.courseCode(classroomId)});
  const mutation=useMutation({mutationFn:async()=>{
      const saved = await enrollmentPhase5.setCourseCode(classroomId,(value??lookup.data??"").trim());
      // Existing marksheets are stored snapshots; refresh them after metadata edits.
      const published = await examManagement.publicResults(classroomId);
      for (const examId of new Set(published.map(row=>row.exam_id))) {
        await api.post(`/classrooms/${classroomId}/exams/${examId}/results/regenerate-marksheet`);
      }
      return saved;
    },onSuccess:()=>{client.invalidateQueries({queryKey:["course-code",classroomId]});client.invalidateQueries({queryKey:["published-results",classroomId]})}});
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();mutation.mutate();}
  return <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
    <div className="mb-3 flex items-center gap-2"><BookOpen size={19}/><h3 className="font-bold">Course code for result PDF</h3></div>
    <p className="mb-3 text-sm text-muted-foreground">Course name comes from the classroom name, and teacher name from the owner profile. Saving here also refreshes previously published marksheet PDFs.</p>
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3"><input aria-label="Course code" maxLength={40} minLength={2} required value={value??lookup.data??""} onChange={e=>setValue(e.target.value)} placeholder="CSE 225" className="min-w-40 flex-1 rounded-xl border border-border bg-background p-3 text-sm"/>
      <button disabled={mutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending&&<LoaderCircle size={16} className="animate-spin"/>} Save course code</button>
    </form>
    {mutation.isSuccess&&<p className="mt-2 text-sm text-green-700">Course code saved. Published marksheets have been refreshed.</p>}
    {mutation.isError&&<p role="alert" className="mt-2 text-sm text-red-700">{getClassroomErrorMessage(mutation.error)}</p>}
  </section>;
}
