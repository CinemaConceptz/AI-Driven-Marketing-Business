"use client";

import { useMemo } from "react";
import Link from "next/link";
import PressImageManager from "@/components/PressImageManager";
import AudioUploadManager from "@/components/AudioUploadManager";
import { useAuth } from "@/providers/AuthProvider";

export default function MediaPage() {
  const { user, loading } = useAuth();
  const uid = useMemo(() => user?.uid ?? null, [user]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10 text-slate-200">
          Loading...
        </div>
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-slate-200"
          data-testid="media-login-required"
        >
          <p className="text-lg font-semibold text-white">Please log in to manage media.</p>
          <p className="mt-2 text-sm text-slate-200">
            Media tools are available after authentication.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
            data-testid="media-login-button"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10">
        <h1 className="text-3xl font-semibold text-white" data-testid="media-title">
          Media
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="media-subtitle">
          Manage your press images and audio tracks for your EPK.
        </p>
      </div>
      
      {/* Audio Upload Section */}
      <AudioUploadManager user={user} maxTracks={2} />
      
      {/* Press Images Section */}
      <PressImageManager user={user} />
    </main>
  );
}
