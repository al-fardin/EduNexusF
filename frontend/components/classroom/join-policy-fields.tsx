"use client";
import { useState, useId } from "react";
import { usePreferences } from "@/providers/preferences-provider";
import type { JoinPolicy } from "@/services/enrollment";
export function localDateTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function JoinPolicyFields({
  value,
  onChange,
  disabled = false,
}: {
  value: JoinPolicy;
  onChange: (v: JoinPolicy) => void;
  disabled?: boolean;
}) {
  const { t } = usePreferences(),
    [expiry, setExpiry] = useState(!!value.class_code_expires_at),
    [date, setDate] = useState(localDateTime(value.class_code_expires_at));
  const expiryHint = useId();
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.code_join_enabled}
          onChange={(e) =>
            onChange({ ...value, code_join_enabled: e.target.checked })
          }
        />
        {t("Allow joining with class code")}
      </label>
      {value.code_join_enabled && (
        <>
          <label className="grid gap-1 text-sm">
            {t("Join approval")}
            <select
              aria-label={t("Join approval")}
              value={value.join_mode}
              onChange={(e) =>
                onChange({
                  ...value,
                  join_mode: e.target.value as JoinPolicy["join_mode"],
                })
              }
              className="min-h-11 rounded-xl border border-border bg-background p-3"
            >
              <option value="direct">{t("Join directly")}</option>
              <option value="approval">{t("Teacher approval required")}</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={expiry}
              onChange={(e) => {
                const checked = e.target.checked;
                setExpiry(checked);
                const iso = checked
                  ? new Date(Date.now() + 7 * 86400000).toISOString()
                  : null;
                setDate(localDateTime(iso));
                onChange({ ...value, class_code_expires_at: iso });
              }}
            />
            {t("Set class code expiry")}
          </label>
          {expiry && (
            <label className="grid gap-1 text-sm">
              {t("Class code expires at")}
              <input
                type="datetime-local"
                required
                aria-label={t("Class code expires at")}
                aria-describedby={expiryHint}
                value={date}
                onChange={(e) => {
                  const next = e.target.value;
                  setDate(next);
                  const parsed = new Date(next);
                  onChange({
                    ...value,
                    class_code_expires_at: Number.isFinite(parsed.getTime())
                      ? parsed.toISOString()
                      : null,
                  });
                }}
                className="min-h-11 min-w-0 max-w-full rounded-xl border border-border bg-background p-3"
              />
              <span id={expiryHint} className="text-xs text-muted-foreground">
                {t(
                  "Uses your device's local time. Existing members keep their access.",
                )}
              </span>
            </label>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {t("Email invitations can be accepted without a class code.")}
      </p>
    </fieldset>
  );
}
