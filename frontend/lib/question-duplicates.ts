import type { ExamQuestion } from "@/services/exams";
export function questionTextKey(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}
export function duplicateWarnings(
  questions: ExamQuestion[],
  existing: ExamQuestion[] = [],
  bank: { prompt: string }[] = [],
): string[][] {
  const seen = new Map<string, number>(),
    existingKeys = new Set(existing.map((q) => questionTextKey(q.prompt))),
    bankKeys = new Set(bank.map((q) => questionTextKey(q.prompt)));
  return questions.map((q, i) => {
    const key = questionTextKey(q.prompt),
      warnings: string[] = [];
    if (!key) return warnings;
    if (seen.has(key))
      warnings.push(`Same question text as import row ${seen.get(key)! + 1}`);
    else seen.set(key, i);
    if (existingKeys.has(key))
      warnings.push("Same question text already exists in this exam");
    if (bankKeys.has(key))
      warnings.push("Same question text already exists in the question bank");
    return warnings;
  });
}
