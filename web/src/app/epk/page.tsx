"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { getAllPressMedia, type PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile } from "@/components/epk/types";
import EpkLayout from "@/components/epk/EpkLayout";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function EpkPage() {
  const { user, loading } = useAuth();
  const uid = useMemo(() => user?.uid ?? null, [user]);
  const [profile, setProfile] = useState<EpkProfile | null>(null);
  const [pressMedia, setPressMedia] = useState<PressMediaDoc[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!uid) {
      setProfile(null);
      setPressMedia([]);
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    let alive = true;

    const loadData = async () => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const [profileSnap, mediaDocs] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getAllPressMedia(uid),
        ]);

        if (!alive) return;

        setProfile(profileSnap.exists() ? (profileSnap.data() as EpkProfile) : null);
        setPressMedia(mediaDocs);
        setStatus("ready");
      } catch (error: any) {
        if (!alive) return;
        setErrorMessage(error?.message ?? String(error));
        setStatus("error");
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [loading, uid]);

  // Check if EPK has all required fields
  const hasArtistName = !!profile?.artistName?.trim();
  const hasBio = !!profile?.bio?.trim();
  const hasGenre = !!(profile?.genres?.length || profile?.genre);
  const hasImage = pressMedia.length > 0;
  
  const isEpkComplete = hasArtistName && hasBio && hasGenre;
  const missingFields: string[] = [];
  if (!hasArtistName) missingFields.push("Artist Name");
  if (!hasBio) missingFields.push("Bio");
  if (!hasGenre) missingFields.push("Genre");
  if (!hasImage) missingFields.push("Press Image (recommended)");

  // Build EPK Handler
  const handleBuildEpk = async () => {
    if (!uid || !isEpkComplete) return;
    
    setBuilding(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        epkReady: true,
        epkPublished: true,
      });
      setProfile(prev => prev ? { ...prev, epkReady: true, epkPublished: true } : prev);
    } catch (err) {
      console.error("Error building EPK:", err);
    } finally {
      setBuilding(false);
    }
  };

  // PDF download handler
  const handleDownloadPdf = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/pdf/epk", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${profile?.artistName || "EPK"}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    }
  };

  // Regenerate EPK handler
  const handleRegenerateEpk = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/pdf/epk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Force regenerate by re-downloading
      await fetch("/api/pdf/epk", {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-force-regenerate": "true"
        },
      });
      alert("EPK regenerated successfully!");
    } catch (err) {
      console.error("Regenerate error:", err);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200">
        Loading EPK...
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-slate-200"
          data-testid="epk-login-cta"
        >
          <p className="text-lg font-semibold text-white">Login required</p>
          <p className="mt-2 text-sm text-slate-200">
            Please sign in to view your EPK.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
            data-testid="epk-login-button"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-red-200"
          data-testid="epk-error"
        >
          {errorMessage || "Unable to load EPK."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-6">
      {/* EPK Header with Actions - For ready EPK */}
      {status === "ready" && profile?.epkReady && (
        <div className="glass-panel rounded-3xl px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Press Kit</h1>
              <p className="text-slate-400 text-sm mt-1">
                {profile?.epkPublished 
                  ? "Published and ready to share" 
                  : "Preview mode"}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={handleDownloadPdf}
                className="px-5 py-2.5 bg-white text-[#021024] font-semibold rounded-full hover:bg-slate-100 transition-colors text-sm"
              >
                Download PDF
              </button>
              <button
                onClick={handleRegenerateEpk}
                className="px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-500 transition-colors text-sm"
              >
                Regenerate EPK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EPK NOT READY WARNING BANNER */}
      {status === "ready" && !profile?.epkReady && (
        <div className="sticky top-0 z-50 rounded-2xl bg-red-600 border-2 border-red-700 px-6 py-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-white text-lg">EPK Not Created Yet</p>
                <p className="text-red-100 text-sm">
                  {isEpkComplete 
                    ? "Your profile is complete! Click 'Build My EPK' to create your Electronic Press Kit."
                    : `Missing: ${missingFields.join(", ")}`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!isEpkComplete ? (
                <Link
                  href="/settings"
                  className="px-5 py-2.5 bg-white text-red-600 font-semibold rounded-full hover:bg-red-50 transition-colors text-sm"
                >
                  Complete Profile
                </Link>
              ) : (
                <button
                  onClick={handleBuildEpk}
                  disabled={building}
                  className="px-5 py-2.5 bg-white text-red-600 font-bold rounded-full hover:bg-red-50 transition-colors text-sm disabled:opacity-70"
                >
                  {building ? "Building..." : "Generate Your EPK"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EPK READY SUCCESS BANNER */}
      {status === "ready" && profile?.epkReady && profile?.epkPublished && (
        <div className="rounded-2xl bg-emerald-600 border border-emerald-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <p className="text-white text-sm font-medium">Your EPK is live and ready to share!</p>
            </div>
            {profile.epkSlug && (
              <Link
                href={`/epk/${profile.epkSlug}`}
                target="_blank"
                className="text-xs text-emerald-100 hover:text-white underline"
              >
                View Public EPK
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Checklist for incomplete EPK */}
      {status === "ready" && !isEpkComplete && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <h3 className="font-semibold text-amber-300 mb-3">Complete your profile to build your EPK:</h3>
          <ul className="space-y-2">
            {[
              { field: "Artist Name", done: hasArtistName },
              { field: "Bio (Required)", done: hasBio },
              { field: "Genre", done: hasGenre },
              { field: "Press Image", done: hasImage, optional: true },
            ].map((item) => (
              <li key={item.field} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <span className="text-emerald-400">✓</span>
                ) : (
                  <span className="text-red-400">✗</span>
                )}
                <span className={item.done ? "text-slate-300" : "text-white font-medium"}>
                  {item.field}
                  {item.optional && <span className="text-slate-500 text-xs ml-1">(recommended)</span>}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/settings"
            className="mt-4 inline-block px-4 py-2 bg-amber-500 text-black font-semibold rounded-full text-sm hover:bg-amber-400 transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* EPK Layout Preview */}
      <div className={!isEpkComplete ? "opacity-50" : ""}>
        <EpkLayout profile={profile} pressMedia={pressMedia} uid={uid} />
      </div>
    </div>
  );
}
