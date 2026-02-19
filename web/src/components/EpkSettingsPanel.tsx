"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";

type Props = {
  user: User;
};

type EpkSettings = {
  epkPublished: boolean;
  epkSlug: string;
  epkSlugLocked: boolean;
};

export default function EpkSettingsPanel({ user }: Props) {
  const [settings, setSettings] = useState<EpkSettings>({
    epkPublished: false,
    epkSlug: "",
    epkSlugLocked: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : "https://verifiedsoundar.com";

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            epkPublished: data.epkPublished ?? false,
            epkSlug: data.epkSlug ?? "",
            epkSlugLocked: data.epkSlugLocked ?? false,
          });
          setSlugInput(data.epkSlug ?? "");
        }
      } catch (err: any) {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user.uid]);

  // Validate slug format
  const validateSlug = (slug: string): boolean => {
    if (!slug) return true; // Empty is ok, will use uid
    if (slug.length < 3) {
      setSlugError("Slug must be at least 3 characters");
      return false;
    }
    if (slug.length > 30) {
      setSlugError("Slug must be 30 characters or less");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("Slug can only contain lowercase letters, numbers, and hyphens");
      return false;
    }
    if (slug.startsWith("-") || slug.endsWith("-")) {
      setSlugError("Slug cannot start or end with a hyphen");
      return false;
    }
    setSlugError(null);
    return true;
  };

  // Toggle publish status
  const handleTogglePublish = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const newPublished = !settings.epkPublished;
      
      // If publishing and no slug set, use uid as default
      const slugToUse = settings.epkSlug || user.uid;
      
      await updateDoc(userRef, {
        epkPublished: newPublished,
        epkSlug: slugToUse,
      });

      setSettings((prev) => ({ 
        ...prev, 
        epkPublished: newPublished,
        epkSlug: slugToUse,
      }));
      setSlugInput(slugToUse);
      
      setSuccess(newPublished ? "EPK is now public!" : "EPK is now private");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update publish status");
    } finally {
      setSaving(false);
    }
  };

  // Save custom slug
  const handleSaveSlug = async () => {
    // Don't allow changes if locked
    if (settings.epkSlugLocked) {
      setError("Your custom URL has been locked and cannot be changed.");
      return;
    }

    const normalizedSlug = slugInput.toLowerCase().trim();
    
    if (!validateSlug(normalizedSlug)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const slugToSave = normalizedSlug || user.uid;
      
      // Lock the slug after first save (if it's a custom slug, not user ID)
      const shouldLock = normalizedSlug && normalizedSlug !== user.uid;
      
      await updateDoc(userRef, {
        epkSlug: slugToSave,
        epkSlugLocked: shouldLock,
      });

      setSettings((prev) => ({ 
        ...prev, 
        epkSlug: slugToSave,
        epkSlugLocked: shouldLock,
      }));
      setSlugInput(slugToSave);
      setSuccess(shouldLock 
        ? "Custom URL saved and locked!" 
        : "Slug updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update slug");
    } finally {
      setSaving(false);
    }
  };

  // Copy EPK link
  const handleCopyLink = async () => {
    const slug = settings.epkSlug || user.uid;
    const url = `${baseUrl}/epk/${slug}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Link copied to clipboard!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl px-6 py-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-32 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-48"></div>
      </div>
    );
  }

  const epkUrl = `${baseUrl}/epk/${settings.epkSlug || user.uid}`;

  return (
    <div className="glass-panel rounded-2xl px-6 py-6 space-y-6" data-testid="epk-settings-panel">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">EPK Settings</h3>
        <p className="text-sm text-slate-400 mt-1">
          Control your public Electronic Press Kit visibility and URL
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Publish Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <p className="font-medium text-white">Publish EPK</p>
          <p className="text-sm text-slate-400">
            {settings.epkPublished 
              ? "Your EPK is visible to anyone with the link" 
              : "Your EPK is currently private"}
          </p>
        </div>
        <button
          onClick={handleTogglePublish}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            settings.epkPublished ? "bg-emerald-600" : "bg-white/20"
          } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
          data-testid="epk-publish-toggle"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              settings.epkPublished ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Custom Slug */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-white">Custom URL Slug</span>
          <p className="text-xs text-slate-400 mt-1">
            {settings.epkSlugLocked 
              ? "Your custom URL has been set and is now locked."
              : "Leave empty to use your user ID or add your stage name. ONLY lowercase letters, numbers, and hyphens."}
          </p>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className={`flex items-center rounded-xl border bg-white/5 overflow-hidden ${
              settings.epkSlugLocked ? "border-emerald-500/30" : "border-white/10"
            }`}>
              <span className="px-3 text-sm text-slate-500 bg-white/5 py-2.5 border-r border-white/10">
                /epk/
              </span>
              <input
                type="text"
                value={slugInput}
                onChange={(e) => {
                  if (!settings.epkSlugLocked) {
                    setSlugInput(e.target.value.toLowerCase());
                    setSlugError(null);
                  }
                }}
                placeholder={user.uid.slice(0, 12) + "..."}
                disabled={settings.epkSlugLocked}
                className={`flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none ${
                  settings.epkSlugLocked ? "cursor-not-allowed opacity-70" : ""
                }`}
                data-testid="epk-slug-input"
              />
              {settings.epkSlugLocked && (
                <span className="px-3 text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              )}
            </div>
            {slugError && (
              <p className="mt-1 text-xs text-red-400">{slugError}</p>
            )}
          </div>
          {!settings.epkSlugLocked && (
            <button
              onClick={handleSaveSlug}
              disabled={saving || slugInput === settings.epkSlug}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#021024] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              data-testid="epk-save-slug-btn"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* EPK Link Preview */}
      {settings.epkPublished && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <p className="text-sm font-medium text-white">Your EPK Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-emerald-400 truncate">
              {epkUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              data-testid="epk-copy-link-btn"
            >
              Copy
            </button>
            <a
              href={epkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              data-testid="epk-view-link"
            >
              View
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
