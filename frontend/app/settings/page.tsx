"use client";

import axios from "axios";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { authService } from "@/services/auth";
import {
  type AuthUser,
  useAuthStore,
} from "@/store/auth-store";

type ApiErrorResponse = {
  message?: string;
};

type SettingsPanel =
  | "profile"
  | "password"
  | null;

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const setUser = useAuthStore(
    (state) => state.setUser
  );

  const [activePanel, setActivePanel] =
    useState<SettingsPanel>(null);

  const [user, setLocalUser] =
    useState<AuthUser | null>(null);

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileSuccess, setProfileSuccess] =
    useState("");

  const [profileError, setProfileError] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    currentPasswordEditable,
    setCurrentPasswordEditable,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const clearPasswordFields =
    useCallback(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setCurrentPasswordEditable(false);
      setPasswordError("");
      setPasswordSuccess("");
    }, []);

  const closePanel = useCallback(() => {
    if (activePanel === "password") {
      clearPasswordFields();
    }

    setActivePanel(null);
  }, [
    activePanel,
    clearPasswordFields,
  ]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response =
          await authService.me();

        const currentUser =
          response.data as AuthUser;

        setLocalUser(currentUser);
        setUser(currentUser);

        setFirstName(
          currentUser.first_name
        );

        setLastName(
          currentUser.last_name
        );

        setPhone(
          currentUser.phone ?? ""
        );

        setAvatarUrl(
          normalizeAvatarUrl(
            currentUser.avatar_url
          )
        );
      } catch (error: unknown) {
        console.error(error);

        setProfileError(
          "Unable to load profile information."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [setUser]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [activePanel, closePanel]);

  const openPanel = (
    panel: Exclude<SettingsPanel, null>
  ) => {
    setProfileSuccess("");
    setProfileError("");
    setPasswordSuccess("");
    setPasswordError("");

    if (panel === "password") {
      clearPasswordFields();
    }

    setActivePanel(panel);
  };

  const updateProfile = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim()
    ) {
      setProfileError(
        "First name and last name are required."
      );

      return;
    }

    const cleanAvatarUrl =
      avatarUrl.trim();

    if (
      cleanAvatarUrl &&
      !isValidWebUrl(cleanAvatarUrl)
    ) {
      setProfileError(
        "Avatar URL must start with http:// or https://."
      );

      return;
    }

    setSavingProfile(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const response =
        await authService.updateProfile({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          avatar_url: cleanAvatarUrl,
        });

      const profileResponse =
        await authService.me();

      const updatedUser =
        profileResponse.data as AuthUser;

      setLocalUser(updatedUser);
      setUser(updatedUser);

      setFirstName(
        updatedUser.first_name
      );

      setLastName(
        updatedUser.last_name
      );

      setPhone(
        updatedUser.phone ?? ""
      );

      setAvatarUrl(
        normalizeAvatarUrl(
          updatedUser.avatar_url
        )
      );

      setProfileSuccess(
        response.message ??
          "Profile updated successfully."
      );
    } catch (error: unknown) {
      setProfileError(
        getErrorMessage(
          error,
          "Unable to update profile."
        )
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword) {
      setPasswordError(
        "Enter your current password."
      );

      return;
    }

    if (!newPassword) {
      setPasswordError(
        "Enter a new password."
      );

      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );

      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setPasswordError(
        "New password and confirmation do not match."
      );

      return;
    }

    if (
      currentPassword === newPassword
    ) {
      setPasswordError(
        "New password must be different from the current password."
      );

      return;
    }

    setChangingPassword(true);
    setPasswordSuccess("");
    setPasswordError("");

    try {
      const response =
        await authService.changePassword({
          current_password:
            currentPassword,
          new_password: newPassword,
        });

      clearPasswordFields();

      setPasswordSuccess(
        response.message ??
          "Password changed successfully."
      );
    } catch (error: unknown) {
      setPasswordError(
        getErrorMessage(
          error,
          "Unable to change password."
        )
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <motion.header
          initial={{
            opacity: 0,
            y: -16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
          }}
          className="mb-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Preferences
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Account settings
            </h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              Choose which part of your
              account you want to manage.
            </p>
          </div>
        </motion.header>

        {loadingProfile ? (
          <SettingsSkeleton />
        ) : (
          <>
            <motion.section
              initial={{
                opacity: 0,
                y: -12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.4,
                delay: 0.08,
              }}
              className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary font-semibold text-white shadow-lg shadow-[#2b342c]/10">
                  {getInitials(user)}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {user
                      ? `${user.first_name} ${user.last_name}`
                      : "EduNexus user"}
                  </p>

                  <p className="truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>

                <div className="ml-auto hidden rounded-full border border-[#b8d3b6] bg-[#e9ede5] px-3 py-1 text-xs font-medium text-[#5f7358] sm:block">
                  Account active
                </div>
              </div>
            </motion.section>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.12,
                  },
                },
              }}
              className="grid gap-5 md:grid-cols-2"
            >
              <SettingsActionCard
                icon={
                  <UserRound className="h-6 w-6" />
                }
                title="Profile information"
                description="Update your name, phone number and profile image."
                badge="Personal details"
                onClick={() =>
                  openPanel("profile")
                }
              />

              <SettingsActionCard
                icon={
                  <ShieldCheck className="h-6 w-6" />
                }
                title="Password & security"
                description="Change your password and protect your account."
                badge="Account security"
                onClick={() =>
                  openPanel("password")
                }
              />
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {activePanel === "profile" && (
          <SettingsModal
            key="profile-panel"
            title="Profile information"
            description="Update your personal details"
            icon={
              <UserRound className="h-5 w-5" />
            }
            onClose={closePanel}
          >
            <form
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void updateProfile();
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id="settingsFirstName"
                  name="settings_first_name"
                  label="First name"
                  value={firstName}
                  autoComplete="given-name"
                  onChange={setFirstName}
                />

                <TextField
                  id="settingsLastName"
                  name="settings_last_name"
                  label="Last name"
                  value={lastName}
                  autoComplete="family-name"
                  onChange={setLastName}
                />

                <div className="sm:col-span-2">
                  <TextField
                    id="settingsPhone"
                    name="settings_phone"
                    label="Phone number"
                    type="tel"
                    value={phone}
                    autoComplete="tel"
                    placeholder="Enter phone number"
                    onChange={setPhone}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextField
                    id="settingsAvatarUrl"
                    name="settings_avatar_link"
                    label="Avatar URL"
                    type="url"
                    value={avatarUrl}
                    autoComplete="off"
                    placeholder="https://example.com/avatar.jpg"
                    onChange={setAvatarUrl}
                  />
                </div>
              </div>

              {profileSuccess && (
                <Message
                  type="success"
                  text={profileSuccess}
                />
              )}

              {profileError && (
                <Message
                  type="error"
                  text={profileError}
                />
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-xl border border-border bg-card px-5 py-3 font-medium text-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-white shadow-lg shadow-[#2b342c]/10 transition hover:-translate-y-0.5 hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />

                  {savingProfile
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </form>
          </SettingsModal>
        )}

        {activePanel === "password" && (
          <SettingsModal
            key="password-panel"
            title="Password & security"
            description="Enter your current password manually"
            icon={
              <KeyRound className="h-5 w-5" />
            }
            onClose={closePanel}
          >
            <form
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void changePassword();
              }}
            >
              <div className="space-y-5">
                <PasswordField
                  id="securityCurrentPassword"
                  name="security_current_manual"
                  label="Current password"
                  value={currentPassword}
                  showPassword={
                    showCurrentPassword
                  }
                  readOnly={
                    !currentPasswordEditable
                  }
                  autoComplete="off"
                  onActivate={() =>
                    setCurrentPasswordEditable(
                      true
                    )
                  }
                  onChange={
                    setCurrentPassword
                  }
                  onToggle={() =>
                    setShowCurrentPassword(
                      (current) => !current
                    )
                  }
                />

                <PasswordField
                  id="securityNewPassword"
                  name="security_new_manual"
                  label="New password"
                  value={newPassword}
                  showPassword={showNewPassword}
                  autoComplete="new-password"
                  onChange={setNewPassword}
                  onToggle={() =>
                    setShowNewPassword(
                      (current) => !current
                    )
                  }
                />

                <PasswordStrength
                  password={newPassword}
                />

                <PasswordField
                  id="securityConfirmPassword"
                  name="security_confirm_manual"
                  label="Confirm new password"
                  value={confirmPassword}
                  showPassword={
                    showConfirmPassword
                  }
                  autoComplete="new-password"
                  onChange={
                    setConfirmPassword
                  }
                  onToggle={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                />
              </div>

              {passwordSuccess && (
                <Message
                  type="success"
                  text={passwordSuccess}
                />
              )}

              {passwordError && (
                <Message
                  type="error"
                  text={passwordError}
                />
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-xl border border-border bg-card px-5 py-3 font-medium text-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-white shadow-lg shadow-[#2b342c]/10 transition hover:-translate-y-0.5 hover:bg-[#536058] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />

                  {changingPassword
                    ? "Updating..."
                    : "Update password"}
                </button>
              </div>
            </form>
          </SettingsModal>
        )}
      </AnimatePresence>
    </main>
  );
}

function SettingsActionCard({
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
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition-shadow hover:border-primary hover:shadow-2xl hover:shadow-[#2b342c]/10"
    >
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-background transition duration-500 group-hover:scale-150 group-hover:bg-accent/70" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-[#2b342c]/15 transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
            {icon}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground transition duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {badge}
        </p>

        <h2 className="mt-2 text-xl font-semibold text-foreground">
          {title}
        </h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

function SettingsModal({
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
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/60 bg-card shadow-2xl shadow-[#2b342c]/20"
      >
        <div className="flex items-start justify-between border-b border-border bg-secondary/80 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-[#2b342c]/15">
              {icon}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {title}
              </h2>

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

        <div className="p-6 sm:p-8">
          {children}
        </div>
      </motion.section>
    </motion.div>
  );
}

function TextField({
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
      />
    </div>
  );
}

function PasswordField({
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
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          readOnly={readOnly}
          autoComplete={autoComplete}
          placeholder={`Enter ${label.toLowerCase()}`}
          data-lpignore="true"
          data-1p-ignore="true"
          onFocus={onActivate}
          onMouseDown={onActivate}
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

function SettingsSkeleton() {
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

function Message({
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
          ? "border-[#b8d3b6] bg-[#e9ede5] text-[#5f7358]"
          : "border-[#ffd0d0] bg-[#fff0ef] text-[#b34450]"
      }`}
    >
      {text}
    </motion.p>
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

function normalizeAvatarUrl(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  return isValidWebUrl(value)
    ? value
    : "";
}

function isValidWebUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getInitials(
  user: AuthUser | null
) {
  if (!user) {
    return "EN";
  }

  const first =
    user.first_name.charAt(0);

  const last =
    user.last_name.charAt(0);

  return `${first}${last}`.toUpperCase();
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    axios.isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data?.message ??
      fallback
    );
  }

  return fallback;
}