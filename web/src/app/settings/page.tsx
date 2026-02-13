"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200"
        data-testid="settings-login-required"
      >
        <p className="text-lg font-semibold text-white">Please log in</p>
        <p className="mt-2 text-sm text-slate-200">
          Settings are available after authentication.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
          data-testid="settings-login-button"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10" data-testid="settings-page">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-3 text-sm text-slate-200">
          Profile editing tools will live here. For now, update your details via the
          intake form.
        </p>
        <Link
          href="/apply"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
          data-testid="settings-apply-link"
        >
          Update intake
        </Link>
      </div>
    </div>
  );
}
