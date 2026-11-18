import { imageProblem } from "./question-images";
import type { ExamQuestion, QuestionImage } from "@/services/exams";

export type ImportRow = {
  line: number;
  question: ExamQuestion;
  topic: string;
  difficulty: string;
  errors: string[];
};
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const text = (value: unknown) =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
export const IMPORT_TEMPLATE =
  'question,option_a,option_b,option_c,answer,points,selection,topic,difficulty,explanation,section,subject,chapter\n"Select the prime numbers",2,3,4,"A,B",5,multiple,Numbers,easy,"2 and 3 are prime",Mathematics,Mathematics,Number theory\n';

export function delimitedRows(input: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length) {
        throw Error("Unexpected quote in a table cell");
      } else quoted = !quoted;
    } else if (!quoted && c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted table cell");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length > 101) throw Error("Import at most 100 questions at a time");
  return rows;
}
function tableItems(rows: string[][]): unknown[] {
  if (rows.length < 2)
    throw Error("Include a header row and at least one question");
  const headers = rows[0].map((h) =>
    h.trim().toLowerCase().replace(/[ -]/g, "_"),
  );
  if (!headers.includes("question") && !headers.includes("prompt"))
    throw Error("Table needs a question or prompt column");
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length)
    throw Error("Duplicate table column headings");
  return rows.slice(1).map((cells) => {
    const r: RecordValue = {};
    headers.forEach((h, i) => {
      if (h) r[h] = cells[i] ?? "";
    });
    const options = headers
      .filter((h) => /^option_[a-t]$/.test(h))
      .sort()
      .map((h) => text(r[h]));
    while (options.length && options.at(-1) === "") options.pop();
    const parts = text(r.answer)
      .trim()
      .split(/[,;|]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const indices = parts.map((v) =>
      /^[A-T]$/i.test(v)
        ? v.toUpperCase().charCodeAt(0) - 65
        : /^\d+$/.test(v)
          ? Number(v) - 1
          : options.indexOf(v),
    );
    return {
      ...r,
      kind: "mcq",
      prompt: r.question ?? r.prompt,
      points: r.points ? Number(r.points) : 1,
      options,
      selection: r.selection || "single",
      correct_option: indices.length === 1 ? indices[0] : undefined,
      correct_options: indices,
    };
  });
}
function formsItems(data: RecordValue): unknown[] {
  const items = data.items;
  if (!Array.isArray(items))
    throw Error("Google Forms JSON needs an items array");
  return items.map((item) => {
    const i = record(item),
      q = record(record(i.questionItem).question),
      choice = record(q.choiceQuestion),
      grading = record(q.grading);
    const options = Array.isArray(choice.options)
      ? choice.options.map((v) => text(record(v).value))
      : [];
    const answers = record(grading.correctAnswers).answers;
    const keys = Array.isArray(answers)
      ? answers.map((v) => options.indexOf(text(record(v).value)))
      : [];
    return {
      kind: "mcq",
      prompt: text(i.title),
      points: grading.pointValue ?? 1,
      options,
      selection:
        choice.type === "CHECKBOX"
          ? "multiple"
          : choice.type === "SELECT"
            ? "dropdown"
            : choice.type === "RADIO"
              ? "single"
              : "unsupported",
      correct_option: keys.length === 1 ? keys[0] : undefined,
      correct_options: keys,
      explanation: text(record(grading.generalFeedback).text),
      shuffle_options: choice.shuffle === true,
    };
  });
}
function plainItems(input: string): unknown[] {
  const blocks = input.trim().split(/\n\s*\n/);
  const out: unknown[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const prompt: string[] = [];
    const options: string[] = [];
    let answer = "";
    for (const line of lines) {
      const option = line.match(/^\s*([A-Tকখগঘঙচছজঝঞটঠডঢণতথদধন])[.)]\s+(.+)$/i),
        key = line.match(/^\s*(?:ANSWER|উত্তর|সঠিক উত্তর)\s*:\s*(.+)$/i);
      if (key) answer = key[1];
      else if (option) {
        if (
          ("ABCDEFGHIJKLMNOPQRST".includes(option[1].toUpperCase())
            ? option[1].toUpperCase().charCodeAt(0) - 65
            : "কখগঘঙচছজঝঞটঠডঢণতথদধন".indexOf(option[1])) !== options.length
        )
          throw Error("Option labels must be consecutive, starting with A");
        options.push(option[2]);
      } else if (line.trim())
        prompt.push(line.replace(/^\s*[0-9০-৯]+[.)]\s*/, ""));
    }
    if (!prompt.length && !options.length) continue;
    const keys = answer
      .split(/[,;|]/)
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean)
      .map((v) =>
        /^[A-T]$/.test(v)
          ? v.charCodeAt(0) - 65
          : "কখগঘঙচছজঝঞটঠডঢণতথদধন".indexOf(v),
      );
    out.push({
      kind: "mcq",
      prompt: prompt.join("\n"),
      options,
      points: 1,
      selection: keys.length > 1 ? "multiple" : "single",
      correct_option: keys.length === 1 ? keys[0] : undefined,
      correct_options: keys,
    });
  }
  return out;
}
export function previewItems(items: unknown[]): ImportRow[] {
  if (!items.length || items.length > 100)
    throw Error("Import 1–100 questions at a time");
  return items.map((item, index) => {
    const envelope = record(item),
      raw = record(
        typeof envelope.question === "object" ? envelope.question : item,
      ),
      selection = text(raw.selection) || "single";
    const q: ExamQuestion = {
      subject: text(raw.subject),
      chapter: text(raw.chapter),
      difficulty: ["easy", "medium", "hard"].includes(
        text(envelope.difficulty ?? raw.difficulty),
      )
        ? (text(
            envelope.difficulty ?? raw.difficulty,
          ) as ExamQuestion["difficulty"])
        : undefined,
      image: raw.image as QuestionImage | undefined,
      option_images: raw.option_images as
        | Record<string, QuestionImage>
        | undefined,
      required: raw.required === true,
      id: `import-${index}`,
      kind:
        raw.kind === "theory"
          ? "theory"
          : raw.kind === "coding"
            ? "coding"
            : "mcq",
      prompt: text(raw.prompt).trim(),
      points: typeof raw.points === "number" ? raw.points : 1,
      options: Array.isArray(raw.options) ? raw.options.map(text) : [],
      selection: selection as ExamQuestion["selection"],
      correct_option:
        typeof raw.correct_option === "number" ? raw.correct_option : undefined,
      correct_options: Array.isArray(raw.correct_options)
        ? (raw.correct_options as number[])
        : undefined,
      explanation: text(raw.explanation),
      topic: text(envelope.topic ?? raw.topic),
      section: text(raw.section),
      shuffle_options: raw.shuffle_options === true,
      sample_answer: text(raw.sample_answer),
      language: text(raw.language),
    };
    const errors: string[] = [];
    if (
      new TextEncoder().encode(q.subject ?? "").length > 120 ||
      new TextEncoder().encode(q.chapter ?? "").length > 120
    )
      errors.push("Subject / chapter exceeds 120 bytes");
    if (q.image) {
      const e = imageProblem(q.image);
      if (e) errors.push(e);
    }
    if (q.option_images) {
      if (
        typeof q.option_images !== "object" ||
        Array.isArray(q.option_images)
      ) {
        errors.push("Invalid option images");
        q.option_images = undefined;
      } else
        for (const [key, picture] of Object.entries(q.option_images)) {
          if (
            !/^(0|[1-9]\d*)$/.test(key) ||
            Number(key) >= (q.options?.length ?? 0)
          )
            errors.push("Image belongs to a missing option");
          const e = imageProblem(picture);
          if (e) errors.push(e);
        }
    }

    if (
      new TextEncoder().encode(q.prompt).length < 3 ||
      new TextEncoder().encode(q.prompt).length > 10000
    )
      errors.push("Question needs 3–10,000 bytes");
    if (!Number.isInteger(q.points) || q.points < 1 || q.points > 100)
      errors.push("Points must be 1–100");
    if (
      new TextEncoder().encode(q.topic ?? "").length > 120 ||
      new TextEncoder().encode(q.section ?? "").length > 120
    )
      errors.push("Topic / section exceeds 120 bytes");
    if (
      new TextEncoder().encode(q.explanation ?? "").length > 16000 ||
      new TextEncoder().encode(q.sample_answer ?? "").length > 15000 ||
      new TextEncoder().encode(q.language ?? "").length > 50
    )
      errors.push("Answer notes exceed the supported length");
    if (q.kind === "mcq") {
      const options = q.options ?? [];
      if (
        options.length < 2 ||
        options.length > 20 ||
        options.some(
          (v) => !v.trim() || new TextEncoder().encode(v).length > 1000,
        )
      )
        errors.push("Use 2–20 nonempty choices, up to 1,000 bytes each");
      if (!["single", "multiple", "dropdown"].includes(selection))
        errors.push(
          "Unsupported question type; convert to choice / checkbox / dropdown",
        );
      const keys =
        selection === "multiple"
          ? (q.correct_options ?? [])
          : q.correct_option === undefined
            ? []
            : [q.correct_option];
      if (!keys.length) errors.push("Answer key is missing");
      if (
        new Set(keys).size !== keys.length ||
        keys.some((n) => !Number.isInteger(n) || n < 0 || n >= options.length)
      )
        errors.push("Answer key does not match the choices");
      if (selection !== "multiple") q.correct_options = undefined;
      else {
        q.correct_option = undefined;
        q.correct_options = [...keys].sort((a, b) => a - b);
      }
    }
    const difficulty = text(envelope.difficulty ?? raw.difficulty) || "medium";
    if (!["easy", "medium", "hard"].includes(difficulty))
      errors.push("Difficulty must be easy, medium or hard");
    return {
      line: index + 1,
      question: q,
      topic: q.topic ?? "",
      difficulty,
      errors,
    };
  });
}
export function parseQuestionText(
  input: string,
  format: "json" | "csv" | "tsv" | "text",
): ImportRow[] {
  if (new TextEncoder().encode(input).length > 2 * 1024 * 1024)
    throw Error("Import limit is 2 MB");
  if (format === "json") {
    const data: unknown = JSON.parse(input);
    const r = record(data);
    const items = Array.isArray(data)
      ? data
      : Array.isArray(r.questions)
        ? r.questions
        : Array.isArray(r.items)
          ? formsItems(r)
          : null;
    if (!items)
      throw Error(
        "Use a question array, EduNexus export or Google Forms API JSON",
      );
    return previewItems(items);
  }
  return previewItems(
    format === "text"
      ? plainItems(input)
      : tableItems(
          delimitedRows(
            input.replace(/^\uFEFF/, ""),
            format === "tsv" ? "\t" : ",",
          ),
        ),
  );
}
export { tableItems };
