"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  deletePressImage,
  getAllPressMedia,
  uploadPressImage,
  updateSortOrder,
  validateFile,
  type PressMediaDoc,
  MAX_IMAGES,
} from "@/services/pressMedia";

type Props = {
  user: User | null;
  maxImages?: number; // Tier-aware override (default: MAX_IMAGES = 3)
};

export default function PressImageManager({ user }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<PressMediaDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const uid = useMemo(() => user?.uid ?? null, [user]);
  const canUploadMore = media.length < MAX_IMAGES;

  const refresh = useCallback(async () => {
    if (!uid) return;
    setError(null);
    setLoading(true);
    try {
      const docs = await getAllPressMedia(uid);
      setMedia(docs);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load press media");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (uid) refresh();
    else setMedia([]);
  }, [uid, refresh]);

  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;

    // Frontend validation
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid file");
      ev.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    try {
      if (!user) throw new Error("You must be logged in.");
      const newDoc = await uploadPressImage(file, user, media.length);
      setMedia((prev) => [...prev, newDoc]);
      
      // Send EPK update email
      try {
        const token = await user.getIdToken();
        await fetch("/api/email/epk-updated", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("EPK update email failed", err);
      }
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  }

  async function onDelete(imageId: string) {
    if (!uid) return;
    if (!confirm("Delete this image? This cannot be undone.")) return;

    setError(null);
    setLoading(true);
    try {
      await deletePressImage(uid, imageId);
      setMedia((prev) => prev.filter((m) => m.id !== imageId));
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !uid) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = media.findIndex((m) => m.id === draggedId);
    const targetIndex = media.findIndex((m) => m.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Reorder locally
    const newMedia = [...media];
    const [removed] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(targetIndex, 0, removed);
    setMedia(newMedia);
    setDraggedId(null);

    // Persist to Firestore
    try {
      await updateSortOrder(uid, newMedia.map((m) => m.id));
    } catch (e: any) {
      setError("Failed to save order. Please try again.");
      refresh(); // Revert on error
    }
  }

  function handleDragEnd() {
    setDraggedId(null);
  }

  if (!user) {
    return (
      <div
        className="glass-panel rounded-2xl px-4 py-4 text-sm text-slate-200"
        data-testid="press-image-manager-locked"
      >
        <p className="font-semibold text-white">Press Images</p>
        <p className="mt-1">Log in to upload your press images.</p>
      </div>
    );
  }

  return (
    <div
      className="glass-panel rounded-2xl px-5 py-5 space-y-4"
      data-testid="press-image-manager"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">Press Images</p>
          <p className="text-sm text-slate-200">
            JPG/PNG/WEBP only • Max 1000×1000px • Max 10MB • Up to {MAX_IMAGES} images
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {media.length}/{MAX_IMAGES}
        </span>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          data-testid="press-image-manager-error"
        >
          {error}
        </div>
      )}

      {/* Image Grid */}
      {media.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Drag to reorder • First image is primary
          </p>
          <div className="grid grid-cols-3 gap-3" data-testid="press-image-grid">
            {media.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`relative group cursor-grab active:cursor-grabbing rounded-xl border-2 transition-all ${
                  draggedId === item.id
                    ? "border-blue-500 opacity-50"
                    : index === 0
                    ? "border-emerald-500/50"
                    : "border-white/10 hover:border-white/30"
                }`}
                data-testid={`press-image-item-${index}`}
              >
                <img
                  src={item.downloadURL}
                  alt={`Press image ${index + 1}`}
                  className="aspect-square w-full rounded-lg object-cover"
                  draggable={false}
                />
                
                {/* Primary badge */}
                {index === 0 && (
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    Primary
                  </span>
                )}

                {/* Order number */}
                <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-medium">
                  {index + 1}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => onDelete(item.id)}
                  disabled={loading}
                  className="absolute bottom-1 right-1 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  data-testid={`press-image-delete-${index}`}
                  title="Delete image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Image info on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                  <p className="text-[10px] text-white/80 truncate">
                    {item.width}×{item.height} • {(item.sizeBytes / 1024).toFixed(0)}KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      {canUploadMore ? (
        <div className="flex items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] transition-opacity ${
              uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"
            }`}
            data-testid="press-image-manager-upload"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Image
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
              disabled={uploading || loading}
            />
          </label>
          
          {media.length === 0 && (
            <span className="text-sm text-slate-400">
              No images uploaded yet
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-amber-300" data-testid="press-image-manager-full">
          Maximum {MAX_IMAGES} images reached. Delete one to upload more.
        </p>
      )}

      {/* Refresh button */}
      {media.length > 0 && (
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          data-testid="press-image-manager-refresh"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      )}
    </div>
  );
}
