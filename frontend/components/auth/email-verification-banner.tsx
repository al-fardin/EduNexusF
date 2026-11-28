"use client";

import { LoadingIcon } from "@/components/ui/loading-indicator";
import axios from "axios";
import { MailWarning, RefreshCw } from "lucide-react";
import { useState } from "react";

import { authService } from "@/services/auth";

type ApiErrorResponse = {
  message?: string;
};

export function EmailVerificationBanner({
  email,
}: {
  email: string;
}) {
  const [sending, setSending] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const resendVerification = async () => {
    setSending(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response =
        await authService.resendVerification({
          email,
        });

      setSuccessMessage(
        response.message ??
          "Verification email sent successfully."
      );
    } catch (error: unknown) {
      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setErrorMessage(
          error.response?.data?.message ??
            "Unable to send verification email."
        );
      } else {
        setErrorMessage(
          "Unable to send verification email."
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-secondary p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary">
            <MailWarning className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-foreground">
              Verify your email address
            </h2>

            <p className="mt-1 break-all text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <button
          type="button"
          disabled={sending}
          onClick={() =>
            void resendVerification()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? <LoadingIcon size={16}/> : <RefreshCw

          />}

          {sending
            ? "Sending..."
            : "Resend email"}
        </button>
      </div>

      {successMessage && (
        <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-primary">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
