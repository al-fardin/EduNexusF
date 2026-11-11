import { classPath } from "@/services/workspace";
export function resourceLink(item: {
  kind: string;
  id: string;
  classroom_id: string;
  role: string;
}) {
  const base = classPath(item.classroom_id, item.role);
  switch (item.kind) {
    case "class":
      return base;
    case "assignment":
      return `${base}?tab=classwork&work=assignments&assignment=${item.id}`;
    case "material":
      return `${base}?tab=classwork&work=materials`;
    case "exam":
      return `${base}?tab=exam`;
    case "event":
      return "/calendar";
    default:
      return `${base}?tab=stream`;
  }
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function needsSupport(student: {
  percent: number | null;
  missing: number;
  present: number;
  attendance_total: number;
}) {
  return (
    student.missing > 0 ||
    (student.percent !== null && student.percent < 50) ||
    (student.attendance_total > 0 &&
      student.present / student.attendance_total < 0.75)
  );
}
