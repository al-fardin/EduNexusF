"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import {
  emptyExamSelection,
  restoreExamSelection,
  type ExamSelection,
} from "@/lib/restore-exam-selection";

// Keep user selection separate from restoring external browser/server state.
// A failed verification retains the draft and requires an explicit retry.
export function useExamSelection(classroomId: string, canManage: boolean) {
  const user = useAuthStore((s) => s.user?.id);
  const scope = `${user}:${classroomId}`;
  const [override, setOverride] = useState<{
    scope: string;
    value: ExamSelection;
  } | null>(null);
  const selection = override?.scope === scope ? override.value : null;
  const restore = useQuery({
    queryKey: ["exam-selection", user, classroomId, canManage],
    enabled: !canManage,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: ({ signal }) => restoreExamSelection(classroomId, signal),
  });
  const current = selection ?? restore.data ?? emptyExamSelection();
  function updateSelection(patch: Partial<ExamSelection>) {
    setOverride((previous) => ({
      scope,
      value: {
        ...(previous?.scope === scope
          ? previous.value
          : (restore.data ?? emptyExamSelection())),
        ...patch,
      },
    }));
  }
  return {
    ...current,
    restore,
    restoreReady: selection !== null || restore.isSuccess,
    setTaking: (taking: string | null) => updateSelection({ taking }),
    setEntryExam: (entryExam: string | null) => updateSelection({ entryExam }),
  };
}
