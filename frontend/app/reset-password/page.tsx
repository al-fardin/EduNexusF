"use client";

import axios from "axios";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useState,
} from "react";

import { authService } from "@/services/auth";

type ApiErrorResponse = {
  message?: string;
};

type ResetStatus =
  | "form"
  | "loading"
  | "success"
  | "invalid";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [status, setStatus] =
    useState<ResetStatus>(
      token ? "form" : "invalid"
    );

  const [message, setMessage] =
    useState(
      token
        ? ""
        : "Password reset token is missing."
    );

  const resetPassword = async () => {
    if (!token) {
      setStatus("invalid");

      setMessage(
        "Password reset token is missing."
      );

      return;
    }

    if (!password) {
      setMessage(
        "Please enter a new password."
      );

      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Password and confirm password do not match."
      );

      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response =
        await authService.resetPassword({
          token,
          password,
        });

      setStatus("success");

      setMessage(
        response.message ??
          "Password reset successfully."
      );
    } catch (error: unknown) {
      setStatus("form");

      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setMessage(
          error.response?.data?.message ??
            "Unable to reset password."
        );
      } else {
        setMessage(
          "Unable to reset password."
        );
      }
    }
  };

  if (status === "invalid") {
    return (
      <StatusCard
        type="error"
        title="Invalid reset link"
        message={message}
        buttonText="Return to login"
        buttonHref="/login"
      />
    );
  }

  if (status === "success") {
    return (
      <StatusCard
        type="success"
        title="Password reset complete"
        message={message}
        buttonText="Sign in with new password"
        buttonHref="/login"
      />
    );
  }

  return (
    <main className="en-auth-page flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="en-auth-grid">
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus welcome">
        <div className="en-auth-art-mark"><span style={{display:"inline-flex",border:"1px solid #d6dfcf",borderRadius:"15px",padding:"8px 10px"}}>EN.</span> EduNexus</div>
        <div><p className="en-label" style={{color:"#f1dbac"}}>YOUR CLASSROOM COMPANION</p><h2>A FRESH <br /> START.</h2><p>Keep your classroom workspace secure with a strong password.</p></div>
        <div className="en-auth-art-ticket">✦ &nbsp; Learn together. Build better. &nbsp; ✦</div>
      </aside>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl en-auth-form">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-[#2b342c]/15">
          <KeyRound className="h-7 w-7" />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create new password
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter and confirm your new
            password.
          </p>
        </div>

        <form
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            void resetPassword();
          }}
        >
          <div className="mt-8 space-y-5">
            <PasswordField
              id="resetNewPassword"
              label="New password"
              value={password}
              showPassword={showPassword}
              onChange={(value) => {
                setPassword(value);
                setMessage("");
              }}
              onToggle={() =>
                setShowPassword(
                  (current) => !current
                )
              }
            />

            <PasswordStrength
              password={password}
            />

            <PasswordField
              id="resetConfirmPassword"
              label="Confirm new password"
              value={confirmPassword}
              showPassword={
                showConfirmPassword
              }
              onChange={(value) => {
                setConfirmPassword(value);
                setMessage("");
              }}
              onToggle={() =>
                setShowConfirmPassword(
                  (current) => !current
                )
              }
            />
          </div>

          {message && (
            <p className="mt-5 rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white shadow-lg shadow-[#2b342c]/10 transition hover:-translate-y-0.5 hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading"
              ? "Resetting password..."
              : "Reset password"}
          </button>

          <Link
            href="/login"
            className="mt-6 block text-center text-sm font-medium text-muted-foreground transition hover:text-foreground hover:underline"
          >
            Back to login
          </Link>
        </form>
      </div>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  showPassword,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          autoComplete="new-password"
          value={value}
          placeholder={label}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
        />

        <button
          type="button"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({
  password,
}: {
  password: string;
}) {
  if (!password) {
    return null;
  }

  const score =
    getPasswordStrength(password);

  const label =
    score <= 1
      ? "Weak"
      : score <= 3
        ? "Medium"
        : "Strong";

  return (
    <div className="-mt-2 rounded-xl bg-secondary p-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={`h-1.5 flex-1 rounded-full transition ${
              item <= score
                ? score <= 1
                  ? "bg-red-500"
                  : score <= 3
                    ? "bg-amber-500"
                    : "bg-green-500"
                : "bg-accent"
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Password strength: {label}
      </p>
    </div>
  );
}

function StatusCard({
  type,
  title,
  message,
  buttonText,
  buttonHref,
}: {
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
  buttonHref: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            type === "success"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-[#b34450]"
          }`}
        >
          {type === "success" ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>

        <Link
          href={buttonHref}
          className="mt-7 block w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058]"
        >
          {buttonText}
        </Link>
      </div>
    </main>
  );
}

function PageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-zinc-950" />

        <p className="mt-4 text-sm text-muted-foreground">
          Loading reset page...
        </p>
      </div>
    </main>
  );
}

function getPasswordStrength(
  password: string
) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password)
  ) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (
    /[^A-Za-z0-9]/.test(password)
  ) {
    score += 1;
  }

  return score;
}