"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/app-feedback";
import { usePreferences } from "@/providers/preferences-provider";
import { copyText } from "@/lib/clipboard";
import { enrollment, type InvitationImport } from "@/services/enrollment";
import { examError } from "@/services/exams";

export function ClassJoinShare({
  code,
  enabled,
  expires,
}: {
  code: string;
  enabled: boolean;
  expires: string | null;
}) {
  const { t } = usePreferences(),
    canvas = useRef<HTMLCanvasElement>(null);
  const [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const url = new URL("/student/classrooms/join", window.location.origin);
    url.searchParams.set("code", code);
    void import("qrcode")
      .then((qr) => {
        if (!cancelled && canvas.current)
          return qr.toCanvas(canvas.current, url.href, {
            width: 224,
            margin: 4,
            errorCorrectionLevel: "M",
          });
      })
      .then(() => {
        if (!cancelled) setLink(url.href);
      })
      .catch(() => {
        if (!cancelled) setError(t("Unable to create QR code"));
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-semibold">{t("Class join link & QR")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("The same approval and code expiry rules apply to shared links.")}
      </p>
      {!enabled ? (
        <p role="status">{t("Code joining is disabled")}</p>
      ) : (
        <>
          <canvas
            ref={canvas}
            role="img"
            aria-label={t("Scan to join this class")}
            className="mx-auto max-w-full rounded-xl"
          />
          {expires && (
            <p className="text-xs text-muted-foreground">
              {t("Expires")}: {new Date(expires).toLocaleString()}
            </p>
          )}
          <label className="grid min-w-0 gap-1 text-sm">
            {t("Join link")}
            <input
              readOnly
              value={link}
              className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11 whitespace-normal"
              type="button"
              variant="outline"
              disabled={!link}
              onClick={() => {
                void copyText(link)
                  .then(() => setCopied(true))
                  .catch(() => setError(t("Unable to copy link")));
              }}
            >
              {t(copied ? "Copied" : "Copy link")}
            </Button>
            <Button
              className="min-h-11 whitespace-normal"
              type="button"
              variant="outline"
              disabled={!link}
              onClick={() => {
                const a = document.createElement("a");
                a.href = canvas.current!.toDataURL("image/png");
                a.download = "class-join-qr.png";
                a.click();
              }}
            >
              {t("Download QR")}
            </Button>
          </div>
        </>
      )}
      {error && <ErrorState message={error} />}
    </section>
  );
}

export function BulkInvitations({
  classId,
  onCreated,
}: {
  classId: string;
  onCreated: () => void;
}) {
  const { t } = usePreferences();
  const readVersion = useRef(0);
  const [csv, setCSV] = useState(""),
    [preview, setPreview] = useState<InvitationImport | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState<number | null>(null);
  async function run(action: "preview" | "commit") {
    setBusy(true);
    setError("");
    setDone(null);
    try {
      const result = await enrollment.importInvitations(
        classId,
        csv,
        action,
        preview?.revision,
      );
      if (action === "commit") {
        setDone(result.created);
        setPreview(null);
        setCSV("");
        onCreated();
      } else setPreview(result);
    } catch (e) {
      setError(examError(e));
      if (action === "commit") setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="space-y-3 rounded-xl border border-border p-4">
      <summary className="min-h-8 cursor-pointer font-semibold">
        {t("Import student emails (CSV)")}
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        {t(
          "One email column, up to 100 rows. Preview before sending invitations.",
        )}
      </p>
      <a
        className="inline-block py-2 text-sm text-primary underline"
        href="data:text/csv;charset=utf-8,email%0Astudent%40example.com%0A"
        download="student-invitations.csv"
      >
        {t("Download CSV template")}
      </a>
      <label className="grid min-w-0 gap-1 text-sm">
        {t("CSV file")}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          className="min-h-11 w-full min-w-0 max-w-full text-sm"
          onChange={(e) => {
            const read = ++readVersion.current;
            const file = e.target.files?.[0];
            setCSV("");
            setPreview(null);
            setDone(null);
            setError("");
            if (!file) return;
            if (file.size > 32768) {
              setError(t("CSV must be at most 32 KB"));
              return;
            }
            void file
              .text()
              .then((text) => {
                if (read === readVersion.current) setCSV(text);
              })
              .catch(() => setError(t("Unable to read file")));
          }}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-sm">
        {t("CSV contents")}
        <textarea
          rows={4}
          disabled={busy}
          value={csv}
          maxLength={32768}
          onChange={(e) => {
            readVersion.current++;
            setCSV(e.target.value);
            setPreview(null);
            setDone(null);
          }}
          placeholder={"email\nstudent@example.com"}
          className="w-full rounded-xl border border-border bg-background p-3"
        />
      </label>
      <Button
        className="min-h-11 whitespace-normal"
        type="button"
        variant="outline"
        disabled={busy || !csv.trim()}
        onClick={() => void run("preview")}
      >
        {t("Preview invitations")}
      </Button>
      {preview && (
        <section className="space-y-3">
          <p className="text-sm">
            {t("Ready")}: {preview.ready} · {t("Daily invitations remaining")}:{" "}
            {preview.remaining}
          </p>
          <ul
            aria-label={t("Invitation preview")}
            className="max-h-60 space-y-2 overflow-y-auto"
          >
            {preview.rows.map((r) => (
              <li
                key={r.line}
                className="flex flex-wrap justify-between gap-2 rounded-lg bg-secondary p-2 text-sm"
              >
                <span className="break-all">
                  {r.line}. {r.email}
                </span>
                <span>
                  {t(
                    (
                      {
                        ready: "Ready",
                        invalid: "Invalid email",
                        duplicate: "Duplicate email",
                        member: "Already joined",
                        cooldown: "Recently invited",
                      } as Record<string, string>
                    )[r.state] ?? r.state,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Button
            className="min-h-11 whitespace-normal"
            type="button"
            disabled={
              busy || !preview.ready || preview.ready > preview.remaining
            }
            onClick={() => void run("commit")}
          >
            {t("Send ready invitations")} ({preview.ready})
          </Button>
        </section>
      )}
      {done !== null && (
        <p role="status" className="text-sm">
          {t("Invitations created")}: {done}
        </p>
      )}
      {error && <ErrorState message={error} />}
    </details>
  );
}
