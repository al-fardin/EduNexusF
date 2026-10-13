"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useState,
} from "react";

import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/auth-store";

type ApiErrorResponse = {
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const setAccessToken = useAuthStore(
    (state) => state.setAccessToken
  );

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const formData = new FormData(
      event.currentTarget
    );

    const email = String(
      formData.get("email") ?? ""
    ).trim();

    const password = String(
      formData.get("password") ?? ""
    );

    if (!email || !password) {
      setErrorMessage(
        "Email and password are required."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await authService.login({
          email,
          password,
        });

      const accessToken =
        response.data.access_token;

      const refreshToken =
        response.data.refresh_token;

      if (
        !accessToken ||
        !refreshToken
      ) {
        throw new Error(
          "Authentication tokens were not returned."
        );
      }

      setAccessToken(accessToken);

      window.localStorage.setItem(
        "access_token",
        accessToken
      );

      window.localStorage.setItem(
        "refresh_token",
        refreshToken
      );

      router.replace("/");
    } catch (error: unknown) {
      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setErrorMessage(
          error.response?.data?.message ??
            "Unable to connect to the server."
        );

        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);

        return;
      }

      setErrorMessage(
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="en-auth-page flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="en-auth-grid">
      <aside className="en-ticket-card en-ticket-dark en-auth-art en-grid-paper" aria-label="EduNexus welcome">
        <div className="en-auth-art-mark"><span style={{display:"inline-flex",border:"1px solid #d6dfcf",borderRadius:"15px",padding:"8px 10px"}}>EN.</span> EduNexus</div>
        <div><p className="en-label" style={{color:"#f1dbac"}}>YOUR CLASSROOM COMPANION</p><h2>YOUR LEARNING, <br /> YOUR SPACE.</h2><p>Teach a class. Join a class. Keep everything that matters in one thoughtful workspace.</p></div>
        <div className="en-auth-art-ticket">✦ &nbsp; Learn together. Build better. &nbsp; ✦</div>
      </aside>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 en-auth-form">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            EduNexus
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your
            account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full touch-manipulation rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-foreground hover:underline"
            >
              Create account
            </Link>
          </p>
        </form>
      </div>
      </div>
    </main>
  );
}