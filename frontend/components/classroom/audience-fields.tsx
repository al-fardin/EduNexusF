"use client";
import { SectionPicker } from "./section-picker";
import { useState, useEffect, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { usePreferences } from "@/providers/preferences-provider";
import {
  type AudienceRule,
  EVERYONE,
  previewAudience,
  audienceLabel,
} from "@/services/audience";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { ContentSkeleton } from "@/components/ui/content-skeleton";
import { examError } from "@/services/exams";

const field =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
const splitRolls = (raw: string) =>
  Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

export function AudienceBadge({ value }: { value?: AudienceRule | null }) {
  const { t } = usePreferences();
  if (
    !value ||
    (value.mode === "all" &&
      !value.exclude_rolls?.length &&
      !value.section_ids?.length)
  )
    return null;
  return (
    <p className="my-2 break-words text-xs font-medium text-primary">
      {t("Audience")}: {t(audienceLabel(value))}
      {value.ranges?.length
        ? ` · ${value.ranges.map((r) => `${r.from}–${r.to}`).join(", ")}`
        : ""}
      {value.mode === "mixed" && value.parity && value.parity !== "any"
        ? ` · ${t(value.parity === "odd" ? "Odd rolls" : "Even rolls")}`
        : ""}
      {value.rolls?.length
        ? ` · ${t("Custom rolls")}: ${value.rolls.length}`
        : ""}
      {value.exclude_rolls?.length
        ? ` · ${t("Exclusions")}: ${value.exclude_rolls.length}`
        : ""}
    </p>
  );
}

export function AudienceFields({
  classId,
  value,
  onChange,
  disabled = false,
  filterMode = false,
}: {
  classId: string;
  value?: AudienceRule | null;
  onChange: (rule: AudienceRule) => void;
  disabled?: boolean;
  filterMode?: boolean;
}) {
  const { t } = usePreferences(),
    id = useId(),
    user = useAuthStore((s) => s.user?.id),
    [open, setOpen] = useState(false);
  const rule = value ?? EVERYONE,
    encoded = JSON.stringify(rule),
    [debounced, setDebounced] = useState(encoded);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(encoded), 350);
    return () => clearTimeout(timer);
  }, [encoded]);
  const preview = useQuery({
    queryKey: ["audience-preview", user, classId, debounced],
    queryFn: ({ signal }) =>
      previewAudience(classId, JSON.parse(debounced), signal),
    enabled: !filterMode && open && !!classId && !!user,
    retry: false,
  });
  const ranges = rule.ranges ?? [];
  function choose(mode: AudienceRule["mode"]) {
    onChange(
      mode === "all"
        ? { mode }
        : {
            ...(mode === "ranges"
              ? { mode, ranges: [{ from: 1, to: 50 }] }
              : mode === "mixed"
                ? {
                    mode,
                    parity: "any" as const,
                    ranges: [{ from: 1, to: 50 }],
                  }
                : { mode }),
            section_ids: rule.section_ids,
          },
    );
  }
  return (
    <details
      className="min-w-0 space-y-4 rounded-xl border border-border bg-secondary/30 p-4"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {t("Advanced settings")}{" "}
        <span className="ml-2 font-normal text-muted-foreground">
          {t("Audience")}: {t(audienceLabel(rule))}
          {rule.exclude_rolls?.length
            ? ` · ${t("Exclusions")}: ${rule.exclude_rolls.length}`
            : ""}
        </span>
      </summary>
      <p className="text-xs text-muted-foreground">
        {t("Optional. Everyone receives this unless you choose an audience.")}
      </p>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="sr-only">{t("Audience")}</legend>
        <label className="grid gap-1 text-sm">
          {t("Who can access this?")}
          <select
            value={rule.mode}
            onChange={(e) => choose(e.target.value as AudienceRule["mode"])}
            className={field}
          >
            {(
              [
                "all",
                "sections",
                "odd",
                "even",
                "ranges",
                "custom",
                "mixed",
              ] as const
            ).map((mode) => (
              <option key={mode} value={mode}>
                {t(audienceLabel({ mode }))}
              </option>
            ))}
          </select>
        </label>
        <SectionPicker
          classId={classId}
          value={rule.section_ids ?? []}
          onChange={(section_ids) =>
            onChange({
              ...rule,
              section_ids,
              mode:
                rule.mode === "all" && section_ids.length
                  ? "sections"
                  : rule.mode === "sections" && !section_ids.length
                    ? "all"
                    : rule.mode,
            })
          }
          enabled={open}
        />
        {(rule.mode === "odd" ||
          rule.mode === "even" ||
          rule.mode === "ranges" ||
          rule.mode === "mixed") && (
          <p id={id} className="text-xs text-muted-foreground">
            {t(
              "Numeric rules use the final number in a roll: CSE-021 means 21. Rolls without a final number require a custom list.",
            )}
          </p>
        )}
        {rule.mode === "mixed" && (
          <label className="grid gap-1 text-sm">
            {t("Parity within ranges")}
            <select
              className={field}
              value={rule.parity ?? "any"}
              onChange={(e) =>
                onChange({
                  ...rule,
                  parity: e.target.value as AudienceRule["parity"],
                })
              }
            >
              {["any", "odd", "even"].map((v) => (
                <option key={v} value={v}>
                  {t(
                    v === "any"
                      ? "Any roll number"
                      : v === "odd"
                        ? "Odd rolls"
                        : "Even rolls",
                  )}
                </option>
              ))}
            </select>
          </label>
        )}
        {(rule.mode === "ranges" || rule.mode === "mixed") && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("Inclusive roll ranges")}</p>
            {ranges.map((range, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-1 text-sm">
                  {t("From roll")} {index + 1}
                  <input
                    type="number"
                    min={0}
                    max={999999999999}
                    step={1}
                    required
                    value={range.from}
                    aria-describedby={id}
                    className={field}
                    onChange={(e) =>
                      onChange({
                        ...rule,
                        ranges: ranges.map((v, i) =>
                          i === index
                            ? { ...v, from: Number(e.target.value) }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-sm">
                  {t("To roll")} {index + 1}
                  <input
                    type="number"
                    min={range.from}
                    max={999999999999}
                    step={1}
                    required
                    value={range.to}
                    aria-describedby={id}
                    className={field}
                    onChange={(e) =>
                      onChange({
                        ...rule,
                        ranges: ranges.map((v, i) =>
                          i === index
                            ? { ...v, to: Number(e.target.value) }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="col-span-2 min-h-11"
                  onClick={() =>
                    onChange({
                      ...rule,
                      ranges: ranges.filter((_, i) => i !== index),
                    })
                  }
                >
                  {t("Remove range")} {index + 1}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              className="min-h-11"
              variant="outline"
              disabled={ranges.length >= 20}
              onClick={() =>
                onChange({ ...rule, ranges: [...ranges, { from: 1, to: 50 }] })
              }
            >
              {t("Add range")}
            </Button>
          </div>
        )}
        {(rule.mode === "custom" || rule.mode === "mixed") && (
          <label className="grid gap-1 text-sm">
            {t(
              rule.mode === "mixed"
                ? "Additional custom rolls"
                : "Custom rolls",
            )}
            <textarea
              key={rule.mode}
              required={rule.mode === "custom"}
              rows={3}
              maxLength={33000}
              defaultValue={(rule.rolls ?? []).join("\n")}
              onChange={(e) =>
                onChange({ ...rule, rolls: splitRolls(e.target.value) })
              }
              placeholder={"001, 003, CSE-021"}
              className={field}
            />
            <span className="text-xs text-muted-foreground">
              {t(
                "Enter full roll values separated by commas or new lines. Leading zeroes matter for custom rolls.",
              )}
            </span>
          </label>
        )}
        {rule.mode === "mixed" && (
          <p className="text-xs text-muted-foreground">
            {t(
              "Numeric rules match parity AND any range. Additional custom rolls are included too. Exclusions always win.",
            )}
          </p>
        )}
        <label className="grid gap-1 text-sm">
          {t("Exclude rolls (optional)")}
          <textarea
            key={`exclude-${rule.mode}`}
            rows={2}
            maxLength={33000}
            defaultValue={(rule.exclude_rolls ?? []).join("\n")}
            onChange={(e) =>
              onChange({ ...rule, exclude_rolls: splitRolls(e.target.value) })
            }
            className={field}
          />
        </label>
      </fieldset>
      {!filterMode && open && (preview.isPending || encoded !== debounced) ? (
        <ContentSkeleton rows={1} />
      ) : !filterMode && open && preview.isError ? (
        <ErrorState message={examError(preview.error)} />
      ) : (
        !filterMode &&
        open &&
        preview.data && (
          <section
            className="space-y-2 rounded-xl border border-border bg-background p-3"
            aria-label={t("Audience preview")}
          >
            <p role="status" className="text-sm font-medium">
              {t("Selected students")}: {preview.data.eligible}/
              {preview.data.total}
            </p>
            {!preview.data.eligible && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "No current students match. Check the rolls, or save this for matching students who join later.",
                )}
              </p>
            )}
            <p className="break-words text-xs text-muted-foreground">
              {preview.data.sample.map((s) => s.roll ?? s.name).join(", ")}
              {preview.data.eligible > 50 ? " …" : ""}
            </p>
          </section>
        )
      )}
    </details>
  );
}
