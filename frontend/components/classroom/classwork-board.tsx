"use client";
import {Localized} from "@/components/ui/localized";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClassroomComposer } from "@/lib/classroom-composer";
import {ClassworkExplorer} from "./classwork-explorer";
import {ExamBoard} from "./exam-board";
import { ClassworkTopics } from "./classwork-topics";
import { AssignmentBoard } from "@/components/classroom/assignments";
import { MaterialLibrary } from "@/components/classroom/material-library";

export function ClassworkBoard({
  classroomId,
  canManage,
}: {
  classroomId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const [composer] = useClassroomComposer();
  const selectedTopic = search.get("topic") ?? "";
  function selectTopic(value: string) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set("topic", value);
    else next.delete("topic");
    router.push(`${path}?${next.toString()}`, { scroll: false });
  }
  const work=search.get("work")??(search.get("assignment")?"assignments":"all");
  const materials=work==="materials";
  function open(kind:"assignment"|"material"|"exam",id:string){const next=new URLSearchParams(search.toString());next.set("work",kind==="exam"?"exams":kind==="material"?"materials":"assignments");if(kind==="assignment")next.set("assignment",id);else next.delete("assignment");router.push(`${path}?${next}`,{scroll:false});}
  function select(value: string) {
    const next = new URLSearchParams(search.toString());
    next.set("work", value);
    router.push(`${path}?${next.toString()}`, { scroll: false });
  }
  if (canManage && composer === "material")
    return <MaterialLibrary classroomId={classroomId} canManage />;
  return (
    <div className="space-y-4">
      <ClassworkTopics
        classId={classroomId}
        canManage={canManage}
        selected={selectedTopic}
        onSelect={selectTopic}
      />
      <div
        className="en-filter-tabs inline-flex w-fit"
        aria-label="Classwork type"
      >
        <button aria-pressed={work==="all"} onClick={()=>select("all")}><Localized>Overview</Localized></button>
        <button aria-pressed={work==="assignments"} onClick={() => select("assignments")}><Localized>Assignments</Localized></button>
        <button aria-pressed={materials} onClick={() => select("materials")}><Localized>Materials</Localized></button>
        <button aria-pressed={work==="exams"} onClick={()=>select("exams")}><Localized>Exams</Localized></button>
      </div>
      {work==="all"?<ClassworkExplorer classId={classroomId} canManage={canManage} onOpen={open}/>:work==="exams"?<ExamBoard classroomId={classroomId} canManage={canManage}/>:materials ? (
        <MaterialLibrary
          classroomId={classroomId}
          canManage={canManage}
          topic={selectedTopic}
        />
      ) : (
        <AssignmentBoard
          classroomId={classroomId}
          canManage={canManage}
          topic={selectedTopic}
        />
      )}
    </div>
  );
}
