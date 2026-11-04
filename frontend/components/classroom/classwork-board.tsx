"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClassroomComposer } from "@/lib/classroom-composer";
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
  const materials = search.get("work") === "materials";
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
        <button aria-pressed={!materials} onClick={() => select("assignments")}>
          Assignments
        </button>
        <button aria-pressed={materials} onClick={() => select("materials")}>
          Materials
        </button>
      </div>
      {materials ? (
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
