"use client";

import axios from "axios";
import Link from "next/link";
import {
  CheckCircle2,
  MailCheck,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useState,
} from "react";

import { authService } from "@/services/auth";

type VerificationStatus =
  | "ready"
  | "loading"
  | "success"
  | "error";

type ApiErrorResponse = {
  message?: string;
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] =
    useState<VerificationStatus>(
      token ? "ready" : "error"
    );

  const [message, setMessage] =
    useState(
      token
        ? "Click the button below to verify your email address."
        : "Verification token is missing."
    );

  const verifyEmail = async () => {
    if (!token) {
      setStatus("error");
      setMessage(
        "Verification token is missing."
      );

      return;
    }

    setStatus("loading");
    setMessage(
      "Please wait while we verify your email."
    );

    try {
      const response =
        await authService.verifyEmail({
          token,
        });

      setStatus("success");
      setMessage(
        response.message ??
          "Your email has been verified successfully."
      );
    } catch (error: unknown) {
      setStatus("error");

      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setMessage(
          error.response?.data?.message ??
            "Email verification failed."
        );
      } else {
        setMessage(
          "Email verification failed."
        );
      }
    }
  };

  return (
    <main className="en-auth-page flex min-h-screen items-center justify-center bg-background px-4">
      <div className="en-auth-grid">
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus welcome">
        <div className="en-auth-art-mark"><span style={{display:"inline-flex",border:"1px solid #d6dfcf",borderRadius:"15px",padding:"8px 10px"}}>EN.</span> EduNexus</div>
        <div><p className="en-label" style={{color:"#f1dbac"}}>YOUR CLASSROOM COMPANION</p><h2>ALMOST <br /> THERE.</h2><p>Verify your email to make the most of EduNexus.</p></div>
        <div className="en-auth-art-ticket">✦ &nbsp; Learn together. Build better. &nbsp; ✦</div>
      </aside>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl en-auth-form">
        <StatusIcon status={status} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification failed"
              : "Verify your email"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>

        {status === "ready" && (
          <button
            type="button"
            onClick={() =>
              void verifyEmail()
            }
            className="mt-7 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058]"
          >
            Verify email
          </button>
        )}

        {status === "loading" && (
          <button
            type="button"
            disabled
            className="mt-7 w-full cursor-not-allowed rounded-xl bg-primary px-4 py-3 font-medium text-white opacity-60"
          >
            Verifying...
          </button>
        )}

        {status === "success" && (
          <Link
            href="/"
            className="mt-7 block w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058]"
          >
            Go to dashboard
          </Link>
        )}

        {status === "error" && (
          <Link
            href="/login"
            className="mt-7 block w-full rounded-xl border border-border bg-card px-4 py-3 font-medium text-foreground transition hover:bg-secondary"
          >
            Go to login
          </Link>
        )}
      </div>
      </div>
    </main>
  );
}

function StatusIcon({
  status,
}: {
  status: VerificationStatus;
}) {
  if (status === "success") {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-[#b34450]">
        <XCircle className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background text-foreground">
      <MailCheck className="h-8 w-8" />
    </div>
  );
}

function PageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-zinc-950" />
    </main>
  );
}