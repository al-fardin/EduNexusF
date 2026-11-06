"use client";

import { ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { motion } from "framer-motion";

import { type ReactNode } from "react";

import { getPasswordStrength } from "./settings-utils";
export function SettingsActionCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={{
        hidden: {
          opacity: 0,
          y: -30,
          scale: 0.97,
        },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
        },
      }}
      transition={{
        duration: 0.45,
        ease: "easeOut",
      }}
      whileHover={{
        y: -7,
        scale: 1.01,
      }}
      whileTap={{
        scale: 0.985,
      }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition-shadow hover:border-primary hover:shadow-2xl hover:shadow-foreground/10"
    >
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-background transition duration-500 group-hover:scale-150 group-hover:bg-accent/70" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-foreground/15 transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
            {icon}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground transition duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {badge}
        </p>

        <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

export function SettingsModal({
  title,
  description,
  icon,
  children,
  onClose,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/45 px-4 py-8 backdrop-blur-sm sm:py-12"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        initial={{
          opacity: 0,
          y: -70,
          scale: 0.94,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: -45,
          scale: 0.97,
        }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 28,
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/60 bg-card shadow-2xl shadow-foreground/20"
      >
        <div className="flex items-start justify-between border-b border-border bg-secondary/80 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-foreground/15">
              {icon}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close settings panel"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition hover:rotate-90 hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8">{children}</div>
      </motion.section>
    </motion.div>
  );
}

export function TextField({
  id,
  name,
  label,
  type = "text",
  value,
  placeholder,
  autoComplete,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  type?: "text" | "tel" | "url";
  value: string;
  placeholder?: string;
  autoComplete?: string;
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
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-lpignore="true"
        data-1p-ignore="true"
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
      />
    </div>
  );
}

export function PasswordField({
  id,
  name,
  label,
  value,
  showPassword,
  readOnly = false,
  autoComplete,
  onChange,
  onToggle,
  onActivate,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  showPassword: boolean;
  readOnly?: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  onActivate?: () => void;
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
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          readOnly={readOnly}
          autoComplete={autoComplete}
          placeholder={`Enter ${label.toLowerCase()}`}
          data-lpignore="true"
          data-1p-ignore="true"
          onFocus={onActivate}
          onMouseDown={onActivate}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
        />

        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
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

export function PasswordStrength({ password }: { password: string }) {
  if (!password) {
    return null;
  }

  const score = getPasswordStrength(password);

  const label = score <= 1 ? "Weak" : score <= 3 ? "Medium" : "Strong";

  return (
    <div className="-mt-2 rounded-xl bg-secondary p-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={`h-1.5 flex-1 rounded-full transition ${
              item <= score
                ? score <= 1
                  ? "bg-destructive/100"
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

export function SettingsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-accent" />

          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-accent" />
            <div className="mt-3 h-3 w-56 rounded bg-background" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <div className="h-12 w-12 rounded-2xl bg-accent" />
            <div className="mt-7 h-3 w-28 rounded bg-background" />
            <div className="mt-4 h-6 w-52 rounded bg-accent" />
            <div className="mt-4 h-3 w-full rounded bg-background" />
            <div className="mt-2 h-3 w-3/4 rounded bg-background" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Message({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  return (
    <motion.p
      initial={{
        opacity: 0,
        y: -8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-[#b8d3b6] bg-secondary text-primary"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {text}
    </motion.p>
  );
}
