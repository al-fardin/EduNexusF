"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { assignments, type Assignment } from "@/services/assignments";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
export function AssignmentDeadline({ classroomId, assignment }: {
    classroomId: string;
    assignment: Assignment;
}) {
    const client = useQueryClient(), [open, setOpen] = useState(false), [due, setDue] = useState("");
    return <div className="space-y-2"><label className="block text-sm">Update deadline<input aria-label="New assignment deadline" type="datetime-local" className="ml-2 rounded-xl border border-border bg-card p-2" value={due} onChange={e => setDue(e.target.value)}/></label><Button variant="outline" disabled={!due || Number.isNaN(new Date(due).getTime())} onClick={() => setOpen(true)}>Change deadline</Button><ReasonDialog open={open} onOpenChange={setOpen} title="Change assignment deadline" description="Existing submissions are retained. The change and reason will appear in activity history." onConfirm={async (reason) => { await assignments.deadline(classroomId, assignment.id, new Date(due).toISOString(), assignment.due_at, reason); await Promise.all([client.invalidateQueries({ queryKey: ["assignments", classroomId] }), client.invalidateQueries({ queryKey: ["classroom-activity", classroomId] })]); setDue(""); }}/></div>;
}
