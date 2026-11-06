"use client";

import { useCallback, useEffect, useState } from "react";

import { authService } from "@/services/auth";
import { type AuthUser, useAuthStore } from "@/store/auth-store";
import {
  normalizeAvatarUrl,
  isValidWebUrl,
  getErrorMessage,
} from "./settings-utils";
type SettingsPanel = "profile" | "password" | null;

export function useSettingsAccount() {
  const setUser = useAuthStore((state) => state.setUser);

  const [activePanel, setActivePanel] = useState<SettingsPanel>(null);

  const [user, setLocalUser] = useState<AuthUser | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState("");

  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPasswordEditable, setCurrentPasswordEditable] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const clearPasswordFields = useCallback(() => {
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
  }, [activePanel, clearPasswordFields]);

  useEffect(() => {
    let canceled = false;
    const owner = useAuthStore.getState().user?.id;
    const isCurrent = () =>
      !canceled && useAuthStore.getState().user?.id === owner;
    const loadProfile = async () => {
      try {
        const response = await authService.me();
        if (!isCurrent()) return;

        const currentUser = response.data as AuthUser;

        setLocalUser(currentUser);
        setUser(currentUser);

        setFirstName(currentUser.first_name);

        setLastName(currentUser.last_name);

        setPhone(currentUser.phone ?? "");

        setAvatarUrl(normalizeAvatarUrl(currentUser.avatar_url));
      } catch {
        if (isCurrent()) {
          console.warn("[EduNexus] Profile information could not be loaded.");
          setProfileError("Unable to load profile information.");
        }
      } finally {
        if (isCurrent()) setLoadingProfile(false);
      }
    };

    void loadProfile();
    return () => {
      canceled = true;
    };
  }, [setUser]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activePanel, closePanel]);

  const openPanel = (panel: Exclude<SettingsPanel, null>) => {
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
    const owner = useAuthStore.getState().user?.id;
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("First name and last name are required.");

      return;
    }

    const cleanAvatarUrl = avatarUrl.trim();

    if (cleanAvatarUrl && !isValidWebUrl(cleanAvatarUrl)) {
      setProfileError("Avatar URL must start with http:// or https://.");

      return;
    }

    setSavingProfile(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const response = await authService.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        avatar_url: cleanAvatarUrl,
      });

      const profileResponse = await authService.me();
      if (useAuthStore.getState().user?.id !== owner) return;

      const updatedUser = profileResponse.data as AuthUser;

      setLocalUser(updatedUser);
      setUser(updatedUser);

      setFirstName(updatedUser.first_name);

      setLastName(updatedUser.last_name);

      setPhone(updatedUser.phone ?? "");

      setAvatarUrl(normalizeAvatarUrl(updatedUser.avatar_url));

      setProfileSuccess(response.message ?? "Profile updated successfully.");
    } catch (error: unknown) {
      setProfileError(getErrorMessage(error, "Unable to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Enter your current password.");

      return;
    }

    if (!newPassword) {
      setPasswordError("Enter a new password.");

      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");

      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from the current password.",
      );

      return;
    }

    setChangingPassword(true);
    setPasswordSuccess("");
    setPasswordError("");

    try {
      const response = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      clearPasswordFields();

      setPasswordSuccess(response.message ?? "Password changed successfully.");
    } catch (error: unknown) {
      setPasswordError(getErrorMessage(error, "Unable to change password."));
    } finally {
      setChangingPassword(false);
    }
  };

  return {
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
  };
}
