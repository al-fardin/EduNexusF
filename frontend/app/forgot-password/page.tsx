"use client";

import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { authService } from "@/services/auth";

type ApiErrorResponse = {
  message?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const sendResetEmail = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage(
        "Please enter your email address."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await authService.forgotPassword({
          email: cleanEmail,
        });

      setSuccessMessage(
        response.message ??
          "Password reset email sent successfully."
      );
    } catch (error: unknown) {
      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setErrorMessage(
          error.response?.data?.message ??
            "Unable to send reset email."
        );
      } else {
        setErrorMessage(
          "Unable to send reset email."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="en-auth-page flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="en-auth-grid">
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus welcome">
        <div className="en-auth-art-mark"><span style={{display:"inline-flex",border:"1px solid #d6dfcf",borderRadius:"15px",padding:"8px 10px"}}>EN.</span> EduNexus</div>
        <div><p className="en-label" style={{color:"#f1dbac"}}>YOUR CLASSROOM COMPANION</p><h2>BACK TO <br /> LEARNING.</h2><p>A quick reset and you’re right back where your classes are.</p></div>
        <div className="en-auth-art-ticket">✦ &nbsp; Learn together. Build better. &nbsp; ✦</div>
      </aside>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl en-auth-form">
        {successMessage ? (
          <SuccessContent
            message={successMessage}
          />
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background text-foreground">
              <Mail className="h-7 w-7" />
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Forgot password?
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter your email address and we
                will send you a password reset
                link.
              </p>
            </div>

            <div className="mt-8">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendResetEmail();
                  }
                }}
                className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void sendResetEmail()
              }
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Sending reset link..."
                : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </>
        )}
      </div>
      </div>
    </main>
  );
}

function SuccessContent({
  message,
}: {
  message: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        Check your email
      </h1>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {message}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        Also check your spam folder.
      </p>

      <Link
        href="/login"
        className="mt-7 block w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058]"
      >
        Return to login
      </Link>
    </div>
  );
}