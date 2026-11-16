import { api } from "@/lib/api";
export type AudienceRule = {
  section_ids?: string[];
  mode: "all" | "odd" | "even" | "ranges" | "custom" | "mixed" | "sections";
  parity?: "any" | "odd" | "even";
  ranges?: Array<{ from: number; to: number }>;
  rolls?: string[];
  exclude_rolls?: string[];
};
export const EVERYONE: AudienceRule = { mode: "all" };
export type AudiencePreview = {
  total: number;
  eligible: number;
  missing_rolls: number;
  sample: Array<{ name: string; roll: string | null }>;
};
export async function previewAudience(
  classId: string,
  rule: AudienceRule,
  signal?: AbortSignal,
): Promise<AudiencePreview> {
  return (
    await api.post(`/classrooms/${classId}/audience/preview`, rule, { signal })
  ).data.data;
}
export function audienceLabel(rule?: AudienceRule | null) {
  if (rule?.mode === "all" && rule.section_ids?.length)
    return "Selected sections";
  return (
    {
      all: "Everyone",
      sections: "Sections",
      odd: "Odd rolls",
      even: "Even rolls",
      ranges: "Roll ranges",
      custom: "Custom rolls",
      mixed: "Mixed audience",
    } as const
  )[rule?.mode ?? "all"];
}
