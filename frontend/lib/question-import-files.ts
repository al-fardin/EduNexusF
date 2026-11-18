import { unzipSync, strFromU8 } from "fflate";
import {
  parseQuestionText,
  previewItems,
  tableItems,
  type ImportRow,
} from "./question-import";

function xml(source: Uint8Array) {
  const value = strFromU8(source);
  if (/<!DOCTYPE|<!ENTITY/i.test(value))
    throw Error("XML entities are not supported");
  const doc = new DOMParser().parseFromString(value, "application/xml");
  if (doc.querySelector("parsererror")) throw Error("Invalid document XML");
  return doc;
}
function elements(node: Document | Element, name: string) {
  return Array.from(node.getElementsByTagNameNS("*", name));
}
function archive(bytes: Uint8Array, kind: "xlsx" | "docx") {
  let total = 0,
    count = 0;
  return unzipSync(bytes, {
    filter: (file) => {
      if (++count > 1000)
        throw Error("Document contains too many archive entries");
      const wanted =
        kind === "docx"
          ? file.name === "word/document.xml"
          : /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(
              file.name,
            );
      if (!wanted) return false;
      total += file.originalSize;
      if (file.originalSize > 8 * 1024 * 1024 || total > 16 * 1024 * 1024)
        throw Error("Expanded document exceeds 16 MB");
      return true;
    },
  });
}
export async function readQuestionFile(file: File): Promise<ImportRow[]> {
  if (file.size > 2 * 1024 * 1024) throw Error("Import limit is 2 MB");
  const ext = file.name.split(".").at(-1)?.toLowerCase();
  if (ext === "json" || ext === "csv" || ext === "tsv")
    return parseQuestionText(await file.text(), ext);
  if (ext === "txt" || ext === "aiken")
    return parseQuestionText(await file.text(), "text");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ext === "docx") {
    const files = archive(bytes, "docx");
    if (!files["word/document.xml"])
      throw Error("DOCX document text is missing");
    const paragraphs = elements(xml(files["word/document.xml"]), "p").map((p) =>
      elements(p, "t")
        .map((t) => t.textContent ?? "")
        .join(""),
    );
    return parseQuestionText(
      paragraphs.join("\n").replace(/(ANSWER\s*:[^\n]+)\n/gi, "$1\n\n"),
      "text",
    );
  }
  if (ext === "xlsx") {
    const files = archive(bytes, "xlsx"),
      sheets = Object.keys(files)
        .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!sheets.length) throw Error("Workbook has no readable worksheet");
    const strings = files["xl/sharedStrings.xml"]
      ? elements(xml(files["xl/sharedStrings.xml"]), "si").map((si) =>
          elements(si, "t")
            .map((t) => t.textContent ?? "")
            .join(""),
        )
      : [];
    const rows = elements(xml(files[sheets[0]]), "row");
    if (rows.length > 101)
      throw Error("Worksheet supports one header and up to 100 questions");
    const table = rows.map((row) => {
      const out: string[] = [];
      for (const cell of elements(row, "c")) {
        const ref = cell.getAttribute("r") ?? "";
        const label = ref.match(/^[A-Z]+/)?.[0];
        if (!label) throw Error("Worksheet cell reference is missing");
        let col = 0;
        for (const ch of label) col = col * 26 + ch.charCodeAt(0) - 64;
        if (col > 64) throw Error("Worksheet supports up to 64 columns");
        if (elements(cell, "f").length)
          throw Error(
            "Replace spreadsheet formulas with values before importing",
          );
        const raw = elements(cell, "v")[0]?.textContent ?? "";
        out[col - 1] =
          cell.getAttribute("t") === "s"
            ? (strings[Number(raw)] ?? "")
            : cell.getAttribute("t") === "inlineStr"
              ? elements(cell, "t")
                  .map((t) => t.textContent ?? "")
                  .join("")
              : raw;
      }
      return out;
    });
    return previewItems(tableItems(table));
  }
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    try {
      const doc = await task.promise;
      if (doc.numPages > 20) throw Error("PDF import supports up to 20 pages");
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i),
          content = await page.getTextContent();
        let output = "";
        for (const item of content.items) {
          if ("str" in item) output += item.str + (item.hasEOL ? "\n" : " ");
        }
        pages.push(output);
      }
      const value = pages.join("\n");
      if (value.trim().length < 3)
        throw Error(
          "Scanned PDFs need OCR; upload selectable text or a table instead",
        );
      return parseQuestionText(
        value.replace(/(ANSWER\s*:[^\n]+)\n/gi, "$1\n\n"),
        "text",
      );
    } finally {
      await task.destroy();
    }
  }
  throw Error(
    "Use CSV, TSV, XLSX, JSON, TXT/Aiken, DOCX or selectable-text PDF",
  );
}
