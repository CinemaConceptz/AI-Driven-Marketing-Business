"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { getAllPressMedia, type PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile, EpkContent } from "@/components/epk/types";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function EpkPage() {
  const { user, loading } = useAuth();
  const uid = useMemo(() => user?.uid ?? null, [user]);
  const [profile, setProfile] = useState<EpkProfile | null>(null);
  const [pressMedia, setPressMedia] = useState<PressMediaDoc[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

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

  // Check requirements
  const hasArtistName = !!profile?.artistName?.trim();
  const hasBio = !!profile?.bio?.trim();
  const hasGenre = !!(profile?.genres?.length || profile?.genre);
  const hasImage = pressMedia.length > 0;
  const isEpkComplete = hasArtistName && hasBio && hasGenre;
  const hasEnhancedEpk = profile?.epkEnhanced && profile?.epkContent;

  const missingFields: string[] = [];
  if (!hasArtistName) missingFields.push("Artist Name");
  if (!hasBio) missingFields.push("Bio");
  if (!hasGenre) missingFields.push("Genre");
  if (!hasImage) missingFields.push("Press Image (recommended)");

  // Generate AI-Enhanced EPK
  const handleGenerateEpk = async () => {
    if (!user || !isEpkComplete) return;

    setGenerating(true);
    setGenerationMessage("Researching artist information...");

    try {
      const token = await user.getIdToken();

      setGenerationMessage("Generating AI-enhanced EPK content...");

      const response = await fetch("/api/epk/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate EPK");
      }

      setGenerationMessage("EPK generated successfully!");

      // Refresh profile data
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as EpkProfile);
      }

      setTimeout(() => setGenerationMessage(""), 3000);
    } catch (error: any) {
      setGenerationMessage("");
      setErrorMessage(error.message || "Failed to generate EPK");
    } finally {
      setGenerating(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/epk/pdf", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const html = await response.text();

      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to download PDF");
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
        <div className="glass-panel rounded-3xl px-8 py-10 text-slate-200">
          <p className="text-lg font-semibold text-white">Login required</p>
          <p className="mt-2 text-sm text-slate-200">Please sign in to view your EPK.</p>
          <Link href="/login" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10 text-red-200">
          {errorMessage || "Unable to load EPK."}
        </div>
      </div>
    );
  }

  const epk = profile?.epkContent;

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Electronic Press Kit</h1>
            <p className="text-slate-400 text-sm mt-1">
              {hasEnhancedEpk ? "AI-Enhanced EPK Ready" : "Generate your professional EPK"}
            </p>
          </div>
          <div className="flex gap-3">
            {hasEnhancedEpk && (
              <button
                onClick={handleDownloadPdf}
                className="px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-slate-100 transition-colors text-sm"
              >
                Download PDF
              </button>
            )}
            <button
              onClick={handleGenerateEpk}
              disabled={generating || !isEpkComplete}
              className="px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : hasEnhancedEpk ? "Regenerate EPK" : "Generate AI EPK"}
            </button>
          </div>
        </div>

        {generationMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm">
            {generationMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Requirements Check */}
      {!isEpkComplete && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <h3 className="font-semibold text-amber-300 mb-3">Complete your profile to generate EPK:</h3>
          <ul className="space-y-2">
            {[
              { field: "Artist Name", done: hasArtistName },
              { field: "Bio", done: hasBio },
              { field: "Genre", done: hasGenre },
              { field: "Press Image", done: hasImage, optional: true },
            ].map((item) => (
              <li key={item.field} className="flex items-center gap-2 text-sm">
                <span className={item.done ? "text-emerald-400" : "text-red-400"}>
                  {item.done ? "Y" : "X"}
                </span>
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
            Complete Profile
          </Link>
        </div>
      )}

      {/* EPK Preview */}
      {hasEnhancedEpk && epk && (
        <div className="space-y-6">
          {/* Artist Header */}
          <div className="glass-panel rounded-3xl px-8 py-10 text-center">
            <h2 className="text-4xl font-bold text-emerald-400 mb-3">{profile.artistName}</h2>
            {epk.tagline && (
              <p className="text-xl text-slate-300 italic mb-4">"{epk.tagline}"</p>
            )}
            <p className="text-slate-400">
              {profile.genres?.join(", ") || profile.genre}
              {profile.location && ` • ${profile.location}`}
            </p>
          </div>

          {/* Style Description */}
          {epk.styleDescription && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
              <p className="text-emerald-200 italic">{epk.styleDescription}</p>
            </div>
          )}

          {/* Press Photos */}
          {pressMedia.length > 0 && (
            <div className="glass-panel rounded-3xl px-8 py-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Press Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pressMedia.slice(0, 6).map((media) => (
                  <div key={media.id} className="aspect-square rounded-xl overflow-hidden bg-slate-800">
                    <img
                      src={media.url}
                      alt="Press photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Bio */}
          <div className="glass-panel rounded-3xl px-8 py-8">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Biography</h3>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{epk.enhancedBio}</p>
          </div>

          {/* Highlights */}
          {epk.highlights && epk.highlights.length > 0 && (
            <div className="glass-panel rounded-3xl px-8 py-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Highlights</h3>
              <ul className="space-y-3">
                {epk.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-200">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Press Release */}
          {epk.pressRelease && (
            <div className="glass-panel rounded-3xl px-8 py-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Press Release</h3>
              <div className="border-l-2 border-emerald-500 pl-6">
                <p className="text-slate-300 leading-relaxed">{epk.pressRelease}</p>
              </div>
            </div>
          )}

          {/* Contact & Links */}
          <div className="glass-panel rounded-3xl px-8 py-8 text-center">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Contact & Links</h3>
            {(profile.contactEmail || profile.email) && (
              <p className="text-xl font-semibold text-emerald-400 mb-4">
                {profile.contactEmail || profile.email}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {profile.links?.spotify && (
                <a href={profile.links.spotify} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Spotify</a>
              )}
              {profile.links?.soundcloud && (
                <a href={profile.links.soundcloud} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">SoundCloud</a>
              )}
              {profile.links?.bandcamp && (
                <a href={profile.links.bandcamp} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Bandcamp</a>
              )}
              {profile.links?.appleMusic && (
                <a href={profile.links.appleMusic} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">Apple Music</a>
              )}
              {profile.links?.youtube && (
                <a href={profile.links.youtube} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">YouTube</a>
              )}
              {profile.links?.instagram && (
                <a href={profile.links.instagram} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Instagram</a>
              )}
              {profile.links?.website && (
                <a href={profile.links.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Website</a>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
              <span>✓</span> Verified Sound A&R
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEpkComplete && !hasEnhancedEpk && (
        <div className="glass-panel rounded-3xl px-8 py-16 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-white mb-2">Ready to Generate Your EPK</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Our AI will enhance your profile, research public information about you, and create a professional press kit.
          </p>
          <button
            onClick={handleGenerateEpk}
            disabled={generating}
            className="px-8 py-3 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate AI-Enhanced EPK"}
          </button>
        </div>
      )}
    </div>
  );
}
