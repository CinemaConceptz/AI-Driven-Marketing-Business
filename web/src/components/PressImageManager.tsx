"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  deletePressImage,
  getPressMedia,
  uploadPressImage,
  type PressMediaDoc,
} from "@/services/pressMedia";

type Props = {
  user: User | null;
};

export default function PressImageManager({ user }: Props) {
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<PressMediaDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uid = useMemo(() => user?.uid ?? null, [user]);

  async function refresh() {
    if (!uid) return;
    setError(null);
    setLoading(true);
    try {
      const doc = await getPressMedia(uid);
      setMedia(doc);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load press media");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (uid) refresh();
    else setMedia(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);
    try {
      if (!user) throw new Error("You must be logged in.");
      const updated = await uploadPressImage(file, user);
      setMedia(updated);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setLoading(false);
      ev.target.value = "";
    }
  }

  async function onDelete() {
    if (!uid) return;
    if (!confirm("Hard delete this press image? This cannot be undone.")) return;

    setError(null);
    setLoading(true);
    try {
      await deletePressImage(uid);
      setMedia(null);
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div
        className="glass-panel rounded-2xl px-4 py-4 text-sm text-slate-200"
        data-testid="press-image-manager-locked"
      >
        <p className="font-semibold text-white">Press Image</p>
        <p className="mt-1">Log in to upload your press image.</p>
      </div>
    );
  }

  return (
    <div
      className="glass-panel rounded-2xl px-5 py-5 space-y-4"
      data-testid="press-image-manager"
    >
      <div>
        <p className="font-semibold text-white">Press Image</p>
        <p className="text-sm text-slate-200">
          JPG/PNG/WEBP only. Max 1000×1000. Max count = 1.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          data-testid="press-image-manager-error"
        >
          {error}
        </div>
      )}

      {media?.downloadURL ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src={media.downloadURL}
            alt="Press"
            className="h-28 w-28 rounded-xl border border-white/10 object-cover"
            data-testid="press-image-manager-thumb"
          />
          <div className="flex-1 space-y-3 text-sm text-slate-200">
            <div>
              <div>
                <span className="font-semibold text-white">Size:</span> {media.width}×
                {media.height}
              </div>
              <div>
                <span className="font-semibold text-white">Type:</span> {media.contentType}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] disabled:opacity-50"
                data-testid="press-image-manager-replace"
              >
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickFile}
                  disabled={loading}
                />
              </label>
              <button
                onClick={onDelete}
                disabled={loading}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                data-testid="press-image-manager-delete"
              >
                Delete
              </button>
              <button
                onClick={refresh}
                disabled={loading}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                data-testid="press-image-manager-refresh"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-200" data-testid="press-image-manager-empty">
            No press image uploaded yet.
          </p>
          <label
            className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] disabled:opacity-50"
            data-testid="press-image-manager-upload"
          >
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
              disabled={loading}
            />
          </label>
        </div>
      )}
    </div>
  );
}
