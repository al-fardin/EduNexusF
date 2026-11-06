"use client";

import {AuthGuard} from "@/components/auth/auth-guard";

import {SettingsContent} from "@/components/settings/settings-content";
export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
