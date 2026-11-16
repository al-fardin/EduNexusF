import { api } from "@/lib/api";
export type AudienceRule = {
  mode: "all" | "odd" | "even" | "ranges" | "custom" | "mixed";
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
  return (
    {
      all: "Everyone",
      odd: "Odd rolls",
      even: "Even rolls",
      ranges: "Roll ranges",
      custom: "Custom rolls",
      mixed: "Mixed audience",
    } as const
  )[rule?.mode ?? "all"];
}
