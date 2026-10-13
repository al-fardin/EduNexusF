"use client";

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
    <section className="mb-6 rounded-2xl border border-[#cbd2c5] bg-[#e9ede5] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[#a96508]">
            <MailWarning className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-amber-950">
              Verify your email address
            </h2>

            <p className="mt-1 text-sm text-amber-800">
              We sent a verification link to{" "}
              <span className="font-medium">
                {email}
              </span>
              .
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={sending}
          onClick={() =>
            void resendVerification()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-card px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              sending ? "animate-spin" : ""
            }`}
          />

          {sending
            ? "Sending..."
            : "Resend email"}
        </button>
      </div>

      {successMessage && (
        <p className="mt-4 rounded-lg bg-[#e9ede5] px-4 py-3 text-sm text-[#5f7358]">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
          {errorMessage}
        </p>
      )}
    </section>
  );
}