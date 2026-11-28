"use client";

import {AuthTransition} from "@/components/auth/auth-transition";
import { AuthBrand } from "@/components/auth/auth-brand";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";

import { authService } from "@/services/auth";

type ApiErrorResponse = {
  message?: string;
};

export default function RegisterPage() {
  const [created, setCreated] = useState(false);

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
    if (loading) return;
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

      setCreated(true);
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
    <main aria-busy={loading} className="en-auth-page flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {loading && <AuthTransition message="Creating your account" />}
      <div className="en-auth-grid">
      <AuthBrand />
      {created ? <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 en-auth-form" role="status">
        <h1 className="text-2xl font-semibold">Account created</h1>
        <Link href="/login" className="en-solid-button">Sign in</Link>
      </div> : <form onSubmit={event => { event.preventDefault(); void registerAccount(); }} aria-busy={loading} className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-xl en-auth-form">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create account
          </h1>

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
            label="Phone (optional)"
            type="tel"
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
          />
        </div>

        {errorMessage && (
          <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
      </form>}
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
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "tel";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
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
        name={id}
        type={type}
        required={id !== "phone"}
        minLength={type === "password" ? 8 : id === "username" ? 3 : undefined}
        maxLength={type === "password" ? 72 : id === "username" ? 30 : undefined}
        value={value}
        placeholder={placeholder}
        autoComplete={
          type === "password" ? "new-password"
            : ({ firstName: "given-name", lastName: "family-name", username: "username", email: "email", phone: "tel" } as Record<string, string>)[id]
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}
