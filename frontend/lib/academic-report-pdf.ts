export type AcademicReportSnapshot = {
  class_name: string;
  teacher_name: string;
  generated_at: string;
  note: string;
  student: {
    id: string;
    name: string;
    roll: string;
    percent: number | null;
    graded: number;
    missing: number;
    present: number;
    attendance_total: number;
    excused: number;
    trend: Array<{
      id: string;
      kind: string;
      title: string;
      at: string;
      score: number;
      maximum: number;
    }>;
  };
};
export function reportText(id: string, s: AcademicReportSnapshot) {
  return [
    "EduNexus · Academic report",
    s.class_name,
    `${s.student.name} · ${s.student.roll}`,
    `Report: ${id}`,
    `Prepared by: ${s.teacher_name}`,
    `Snapshot: ${s.generated_at}`,
    `Average: ${s.student.percent === null ? "Awaiting grades" : s.student.percent.toFixed(1) + "%"}`,
    `Graded work: ${s.student.graded} · Missing: ${s.student.missing}`,
    `Attendance: ${s.student.present}/${s.student.attendance_total} · Excused: ${s.student.excused}`,
    "",
    "Published coursework",
    ...s.student.trend.map(
      (r) => `${r.title} · ${r.kind} · ${r.score}/${r.maximum}`,
    ),
    "",
    s.note,
  ].join("\n");
}
// Browser canvas shapes Bengali/Unicode with the installed fonts. The readable
// HTML and text export remain available because PDF pages are image based.
export async function academicReportPDF(id: string, s: AcademicReportSnapshot) {
  const { jsPDF } = await import("jspdf");
  await document.fonts.ready;
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("PDF rendering is unavailable");
  let y = 0,
    page = 0;
  const font = getComputedStyle(document.body).fontFamily;
  function start() {
    ctx!.fillStyle = "#ffffff";
    ctx!.fillRect(0, 0, 1240, 1754);
    ctx!.fillStyle = "#6d28d9";
    ctx!.font = `600 34px ${font}`;
    ctx!.fillText("EduNexus", 80, 90);
    ctx!.fillStyle = "#171222";
    y = 155;
  }
  function finish() {
    ctx!.fillStyle = "#655b71";
    ctx!.font = `20px ${font}`;
    ctx!.fillText(`Report ${id} · ${page + 1}`, 80, 1690);
    if (page++) pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.94),
      "JPEG",
      0,
      0,
      595.28,
      841.89,
    );
  }
  function line(text: string, bold = false) {
    ctx!.font = `${bold ? "600" : "400"} ${bold ? 28 : 25}px ${font}`;
    const words = text
      .replace(/[\u0000-\u0008\u000b-\u001f]/g, "")
      .split(/\s+/);
    let row = "";
    const rows: string[] = [];
    for (const word of words) {
      if (ctx!.measureText(row + (row ? " " : "") + word).width <= 1080) {
        row += (row ? " " : "") + word;
        continue;
      }
      if (row) rows.push(row);
      row = "";
      for (const segment of new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      }).segment(word)) {
        if (ctx!.measureText(row + segment.segment).width > 1080) {
          rows.push(row);
          row = "";
        }
        row += segment.segment;
      }
    }
    if (row) rows.push(row);
    if (!rows.length) rows.push("");
    for (const r of rows) {
      if (y > 1610) {
        finish();
        start();
        ctx!.font = `${bold ? "600" : "400"} ${bold ? 28 : 25}px ${font}`;
      }
      ctx!.fillStyle = "#171222";
      ctx!.fillText(r, 80, y);
      y += 42;
    }
    y += 12;
  }
  start();
  line("Academic report", true);
  line(s.class_name, true);
  line(`${s.student.name} · ${s.student.roll}`);
  line(
    `Prepared by ${s.teacher_name} · ${new Date(s.generated_at).toLocaleDateString()}`,
  );
  line(
    `Average: ${s.student.percent === null ? "Awaiting grades" : s.student.percent.toFixed(1) + "%"} · Graded: ${s.student.graded} · Missing: ${s.student.missing}`,
  );
  line(
    `Attendance: ${s.student.present}/${s.student.attendance_total} · Excused: ${s.student.excused}`,
  );
  line("Published coursework", true);
  for (const r of s.student.trend)
    line(`${r.title} · ${r.kind} · ${r.score}/${r.maximum}`);
  if (s.note) {
    line("Teacher note", true);
    for (const note of s.note.split("\n")) line(note);
  }
  finish();
  return pdf.output("blob");
}
export function downloadReportBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
