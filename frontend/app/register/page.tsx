"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authService } from "@/services/auth";

type ApiErrorResponse = {
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const registerAccount = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      setErrorMessage(
        "Please fill in all required fields."
      );

      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "Password and confirm password do not match."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await authService.register({
        email: email.trim(),
        username: username.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
      });

      window.alert(
        "Registration successful. Please sign in."
      );

      router.replace("/login");
    } catch (error: unknown) {
      if (
        axios.isAxiosError<ApiErrorResponse>(
          error
        )
      ) {
        setErrorMessage(
          error.response?.data?.message ??
            "Registration failed."
        );
      } else {
        setErrorMessage(
          "Something went wrong."
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
        <div><p className="en-label" style={{color:"#f1dbac"}}>YOUR CLASSROOM COMPANION</p><h2>ONE ACCOUNT. <br /> EVERY CLASS.</h2><p>Your EduNexus account is your place for everything you create and learn.</p></div>
        <div className="en-auth-art-ticket">✦ &nbsp; Learn together. Build better. &nbsp; ✦</div>
      </aside>
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-xl en-auth-form">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create EduNexus Account
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Enter your information to create an account
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <FormField
            id="firstName"
            label="First name"
            placeholder="Enter first name"
            value={firstName}
            onChange={setFirstName}
          />

          <FormField
            id="lastName"
            label="Last name"
            placeholder="Enter last name"
            value={lastName}
            onChange={setLastName}
          />

          <FormField
            id="username"
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChange={setUsername}
          />

          <FormField
            id="phone"
            label="Phone"
            placeholder="Optional phone number"
            value={phone}
            onChange={setPhone}
          />

          <div className="sm:col-span-2">
            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={setEmail}
            />
          </div>

          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
          />

          <FormField
            id="confirmPassword"
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            onEnter={() =>
              void registerAccount()
            }
          />
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-[#ffd0d0] bg-[#fff0ef] px-4 py-3 text-sm text-[#b34450]">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void registerAccount()
          }
          className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Creating account..."
            : "Create account"}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
      </div>
    </main>
  );
}

function FormField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={
          type === "password"
            ? "new-password"
            : undefined
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            onEnter
          ) {
            onEnter();
          }
        }}
        className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}