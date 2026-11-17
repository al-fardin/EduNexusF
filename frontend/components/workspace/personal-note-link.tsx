"use client";
import Link from "next/link";
import { personalNoteHref } from "@/services/personal-workspace";
import { usePreferences } from "@/providers/preferences-provider";
export function PersonalNoteLink({
  classId,
  kind,
  id,
  title = "",
  className = "en-outline-button",
}: {
  classId: string;
  kind: string;
  id: string;
  title?: string;
  className?: string;
}) {
  const { t } = usePreferences();
  return (
    <Link
      className={className}
      href={personalNoteHref(classId, kind, id, title)}
    >
      {t("Personal note")}
    </Link>
  );
}
