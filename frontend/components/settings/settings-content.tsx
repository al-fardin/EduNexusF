"use client";
import {Localized} from "@/components/ui/localized";
import {AccountSecurity} from "./account-security";
import {ReleaseHelp} from "./release-guide";

import {AndroidReleaseSettings} from "@/providers/app-update-provider";
import {AccessibilitySettings} from "./accessibility-settings";
import {usePreferences} from "@/providers/preferences-provider";
import { PushSettings } from "@/components/settings/push-settings";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ProfileAccount } from "@/components/auth/profile-account";
import {
  ArrowLeft,
  KeyRound,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { getInitials } from "./settings-utils";
import {
  SettingsActionCard,
  SettingsModal,
  TextField,
  PasswordField,
  PasswordStrength,
  SettingsSkeleton,
  Message,
} from "./settings-fields";
import { useSettingsAccount } from "./use-settings-account";
export function SettingsContent() {
  const {t}=usePreferences();
  const {
    activePanel,
    user,
    loadingProfile,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    avatarUrl,
    setAvatarUrl,
    savingProfile,
    profileSuccess,
    profileError,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    currentPasswordEditable,
    setCurrentPasswordEditable,
    changingPassword,
    passwordSuccess,
    passwordError,
    closePanel,
    openPanel,
    updateProfile,
    changePassword,
  } = useSettingsAccount();

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
            {t("Back to dashboard")}
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("Preferences")}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("Account settings")}
            </h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              Choose which part of your account you want to manage.
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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-foreground/10">
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

                <div className="ml-auto hidden rounded-full border border-[#b8d3b6] bg-secondary px-3 py-1 text-xs font-medium text-primary sm:block">
                  Account active
                </div>
              </div>
            </motion.section>

            <div className="my-5 max-w-sm">
              <ThemeToggle label />
            </div>
            <PushSettings />
            <ReleaseHelp/><AccountSecurity/><AndroidReleaseSettings/><AccessibilitySettings/><ProfileAccount user={user} />
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
                icon={<UserRound className="h-6 w-6" />}
                title="Profile information"
                description="Update your name, phone number and profile image."
                badge="Personal details"
                onClick={() => openPanel("profile")}
              />

              <SettingsActionCard
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Password & security"
                description="Change your password and protect your account."
                badge="Account security"
                onClick={() => openPanel("password")}
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
            icon={<UserRound className="h-5 w-5" />}
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
                <Message type="success" text={profileSuccess} />
              )}

              {profileError && <Message type="error" text={profileError} />}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-xl border border-border bg-card px-5 py-3 font-medium text-foreground transition hover:bg-secondary hover:text-foreground"
                ><Localized>Cancel</Localized></button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />

                  {savingProfile ? "Saving..." : "Save changes"}
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
            icon={<KeyRound className="h-5 w-5" />}
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
                  showPassword={showCurrentPassword}
                  readOnly={!currentPasswordEditable}
                  autoComplete="off"
                  onActivate={() => setCurrentPasswordEditable(true)}
                  onChange={setCurrentPassword}
                  onToggle={() => setShowCurrentPassword((current) => !current)}
                />

                <PasswordField
                  id="securityNewPassword"
                  name="security_new_manual"
                  label="New password"
                  value={newPassword}
                  showPassword={showNewPassword}
                  autoComplete="new-password"
                  onChange={setNewPassword}
                  onToggle={() => setShowNewPassword((current) => !current)}
                />

                <PasswordStrength password={newPassword} />

                <PasswordField
                  id="securityConfirmPassword"
                  name="security_confirm_manual"
                  label="Confirm new password"
                  value={confirmPassword}
                  showPassword={showConfirmPassword}
                  autoComplete="new-password"
                  onChange={setConfirmPassword}
                  onToggle={() => setShowConfirmPassword((current) => !current)}
                />
              </div>

              {passwordSuccess && (
                <Message type="success" text={passwordSuccess} />
              )}

              {passwordError && <Message type="error" text={passwordError} />}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-xl border border-border bg-card px-5 py-3 font-medium text-foreground transition hover:bg-secondary hover:text-foreground"
                ><Localized>Cancel</Localized></button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-foreground/10 transition hover:-translate-y-0.5 hover:bg-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />

                  {changingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </SettingsModal>
        )}
      </AnimatePresence>
    </main>
  );
}
