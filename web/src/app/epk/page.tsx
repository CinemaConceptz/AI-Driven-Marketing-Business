"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { getAllPressMedia, type PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile, EpkContent } from "@/components/epk/types";
import { Music, Globe, Instagram, Youtube, ExternalLink } from "lucide-react";

type LoadState = "idle" | "loading" | "ready" | "error";

// Social Media Icon Component
function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "spotify":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      );
    case "soundcloud":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.19-1.334c-.01-.057-.044-.09-.078-.09zm1.83-1.229c-.061 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.474-.24-2.547c0-.06-.059-.104-.121-.104zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.138l.225-2.544-.225-2.64c-.015-.075-.075-.135-.166-.135zm.973-.015c-.09 0-.149.075-.165.165l-.195 2.64.21 2.49c.016.09.075.164.165.164.089 0 .164-.074.164-.164l.226-2.49-.226-2.64c-.015-.09-.074-.165-.179-.165zm1.064.104c-.104 0-.179.09-.194.194l-.164 2.55.18 2.43c.016.104.09.179.18.179.104 0 .179-.075.194-.18l.209-2.43-.209-2.55c-.015-.104-.09-.194-.196-.194zm1.035-.149c-.12 0-.209.104-.225.209l-.149 2.685.165 2.37c.016.121.105.21.209.21.119 0 .209-.089.224-.21l.195-2.37-.195-2.685c-.015-.105-.105-.21-.224-.21zm1.065-.165c-.135 0-.225.12-.24.24l-.135 2.775.15 2.295c.015.135.105.239.225.239.135 0 .225-.104.255-.239l.164-2.295-.164-2.775c-.016-.12-.121-.24-.255-.24zm1.051-.135c-.149 0-.254.135-.269.27l-.121 2.865.135 2.22c.015.149.12.27.255.27.149 0 .255-.121.284-.27l.151-2.22-.151-2.865c-.015-.135-.135-.27-.284-.27zm1.215.105c-.165 0-.284.135-.284.285l-.106 2.73.121 2.164c0 .15.119.285.269.285.165 0 .284-.135.299-.285l.135-2.164-.135-2.73c-.015-.15-.134-.285-.299-.285zm1.004-.24c-.181 0-.314.165-.314.33l-.09 2.805.105 2.1c0 .165.119.33.3.33.165 0 .314-.165.314-.33l.12-2.1-.12-2.805c0-.165-.149-.33-.315-.33zm6.289 1.755c-.345 0-.675.06-.975.165-.18-2.025-1.875-3.6-3.93-3.6-.525 0-1.035.105-1.5.285-.194.075-.24.15-.24.3v7.095c0 .165.12.3.285.315 2.1.015 5.46.015 6.345.015 1.32 0 2.4-1.08 2.4-2.4s-1.065-2.175-2.385-2.175z" />
        </svg>
      );
    case "bandcamp":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z" />
        </svg>
      );
    case "appleMusic":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.997 6.124a9.23 9.23 0 00-.24-2.19 5.95 5.95 0 00-.512-1.495 4.58 4.58 0 00-.887-1.286 4.312 4.312 0 00-1.283-.877 5.987 5.987 0 00-1.497-.512 9.25 9.25 0 00-2.19-.24 60.65 60.65 0 00-3.655-.05H10.27a60.65 60.65 0 00-3.655.05 9.23 9.23 0 00-2.19.24 5.95 5.95 0 00-1.497.512 4.58 4.58 0 00-1.283.877 4.312 4.312 0 00-.877 1.283 5.987 5.987 0 00-.512 1.497 9.25 9.25 0 00-.24 2.19 60.65 60.65 0 00-.05 3.655v3.462a60.65 60.65 0 00.05 3.655 9.23 9.23 0 00.24 2.19 5.95 5.95 0 00.512 1.497 4.58 4.58 0 00.877 1.283 4.312 4.312 0 001.283.877 5.987 5.987 0 001.497.512 9.25 9.25 0 002.19.24 60.65 60.65 0 003.655.05h3.462a60.65 60.65 0 003.655-.05 9.23 9.23 0 002.19-.24 5.95 5.95 0 001.497-.512 4.58 4.58 0 001.283-.877 4.312 4.312 0 00.877-1.283 5.987 5.987 0 00.512-1.497 9.25 9.25 0 00.24-2.19 60.65 60.65 0 00.05-3.655V9.779a60.65 60.65 0 00-.05-3.655zm-4.89 8.73l-.002.013c-.003.015-.25 1.51-.25 1.51-.07.392-.18.77-.41 1.102-.23.332-.54.59-.88.77-.36.18-.73.27-1.15.27-.24 0-.5-.04-.74-.12a2.32 2.32 0 01-.66-.35 1.93 1.93 0 01-.49-.54 1.41 1.41 0 01-.18-.68c0-.27.06-.53.18-.76.12-.24.28-.45.48-.63.2-.18.43-.32.68-.42.26-.1.54-.15.82-.15.28 0 .55.05.8.15.04-.28.08-.55.11-.82.03-.26.05-.53.06-.79V8.33c0-.28-.04-.54-.11-.78-.07-.24-.17-.45-.31-.62-.14-.17-.3-.3-.5-.38-.19-.08-.4-.12-.64-.12-.14 0-.28.01-.42.04-.14.03-.27.07-.4.12-.13.05-.25.11-.36.19a1.12 1.12 0 00-.28.26.99.99 0 00-.18.33.93.93 0 00-.06.35c0 .13.02.26.07.38.05.12.11.22.19.31.08.09.17.17.28.23.11.06.22.1.34.13-.02.07-.04.14-.05.22-.01.08-.02.15-.02.23 0 .19.03.37.1.54.07.17.16.32.28.44.12.13.26.23.42.3.16.07.33.11.51.11.19 0 .36-.04.52-.11.16-.07.3-.17.41-.3.12-.12.21-.27.28-.44.07-.17.1-.35.1-.54 0-.14-.02-.27-.05-.4a1.15 1.15 0 00-.15-.36.93.93 0 00-.24-.28.97.97 0 00-.32-.19v-.04c.29-.03.56-.1.81-.22.25-.12.47-.27.65-.46.19-.19.33-.41.43-.66.1-.25.15-.53.15-.82 0-.33-.06-.63-.19-.91a2.03 2.03 0 00-.52-.71 2.35 2.35 0 00-.79-.46 2.86 2.86 0 00-.98-.16c-.43 0-.83.09-1.2.26-.36.17-.68.41-.94.71-.27.3-.48.65-.63 1.06-.15.4-.23.84-.23 1.31v4.97l-.002.063z" />
        </svg>
      );
    case "youtube":
      return <Youtube className="w-5 h-5" />;
    case "instagram":
      return <Instagram className="w-5 h-5" />;
    case "website":
      return <Globe className="w-5 h-5" />;
    default:
      return <Music className="w-5 h-5" />;
  }
}

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

        setProfile(
          profileSnap.exists() ? (profileSnap.data() as EpkProfile) : null,
        );
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

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to download PDF");
    }
  };

  // Build social links array
  const socialLinks = [];
  if (profile?.links?.spotify)
    socialLinks.push({
      platform: "spotify",
      url: profile.links.spotify,
      color: "text-green-400",
    });
  if (profile?.links?.soundcloud)
    socialLinks.push({
      platform: "soundcloud",
      url: profile.links.soundcloud,
      color: "text-orange-400",
    });
  if (profile?.links?.bandcamp)
    socialLinks.push({
      platform: "bandcamp",
      url: profile.links.bandcamp,
      color: "text-teal-400",
    });
  if (profile?.links?.appleMusic)
    socialLinks.push({
      platform: "appleMusic",
      url: profile.links.appleMusic,
      color: "text-pink-400",
    });
  if (profile?.links?.youtube)
    socialLinks.push({
      platform: "youtube",
      url: profile.links.youtube,
      color: "text-red-400",
    });
  if (profile?.links?.instagram)
    socialLinks.push({
      platform: "instagram",
      url: profile.links.instagram,
      color: "text-purple-400",
    });
  if (profile?.links?.website)
    socialLinks.push({
      platform: "website",
      url: profile.links.website,
      color: "text-blue-400",
    });

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
          <p className="mt-2 text-sm text-slate-200">
            Please sign in to view your EPK.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
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
            <h1 className="text-2xl font-bold text-white">
              Your Electronic Press Kit
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {hasEnhancedEpk
                ? "AI-Enhanced EPK Ready"
                : "Generate your professional EPK"}
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
              {generating
                ? "Generating..."
                : hasEnhancedEpk
                  ? "Regenerate EPK"
                  : "Generate AI EPK"}
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
          <h3 className="font-semibold text-amber-300 mb-3">
            Complete your profile to generate EPK:
          </h3>
          <ul className="space-y-2">
            {[
              { field: "Artist Name", done: hasArtistName },
              { field: "Bio", done: hasBio },
              { field: "Genre", done: hasGenre },
              { field: "Press Image", done: hasImage, optional: true },
            ].map((item) => (
              <li key={item.field} className="flex items-center gap-2 text-sm">
                <span
                  className={item.done ? "text-emerald-400" : "text-red-400"}
                >
                  {item.done ? "Y" : "X"}
                </span>
                <span
                  className={
                    item.done ? "text-slate-300" : "text-white font-medium"
                  }
                >
                  {item.field}
                  {item.optional && (
                    <span className="text-slate-500 text-xs ml-1">
                      (recommended)
                    </span>
                  )}
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
            <h2 className="text-4xl font-bold text-emerald-400 mb-3">
              {profile.artistName}
            </h2>
            {epk.tagline && (
              <p className="text-xl text-slate-300 italic mb-4">
                &quot;{epk.tagline}&quot;
              </p>
            )}
            <p className="text-slate-400 mb-6">
              {profile.genres?.join(", ") || profile.genre}
              {profile.location && ` | ${profile.location}`}
            </p>

            {/* Social Icons */}
            {socialLinks.length > 0 && (
              <div className="flex justify-center gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${link.color} hover:opacity-80 transition-opacity p-2 rounded-full bg-white/5 hover:bg-white/10`}
                    title={link.platform}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
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
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                Press Photos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pressMedia.slice(0, 6).map((media) => (
                  <div
                    key={media.id}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-800"
                  >
                    <img
                      src={media.downloadURL}
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
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
              Biography
            </h3>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
              {epk.enhancedBio}
            </p>
          </div>

          {/* Highlights */}
          {epk.highlights && epk.highlights.length > 0 && (
            <div className="glass-panel rounded-3xl px-8 py-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                Highlights
              </h3>
              <ul className="space-y-3">
                {epk.highlights.map((highlight, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-slate-200"
                  >
                    <span className="text-emerald-400 mt-1">&#10003;</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Press Release */}
          {epk.pressRelease && (
            <div className="glass-panel rounded-3xl px-8 py-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                Press Release
              </h3>
              <div className="border-l-2 border-emerald-500 pl-6">
                <p className="text-slate-300 leading-relaxed">
                  {epk.pressRelease}
                </p>
              </div>
            </div>
          )}

          {/* Contact & Links */}
          <div className="glass-panel rounded-3xl px-8 py-8 text-center">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">
              Contact
            </h3>
            {(profile.contactEmail || profile.email) && (
              <p className="text-xl font-semibold text-emerald-400 mb-6">
                {profile.contactEmail || profile.email}
              </p>
            )}

            {/* Social Icons (repeated for contact section) */}
            {socialLinks.length > 0 && (
              <div className="flex justify-center gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={`contact-${link.platform}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${link.color} hover:opacity-80 transition-opacity p-3 rounded-full bg-white/5 hover:bg-white/10`}
                    title={link.platform}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
              <span>&#10003;</span> Verified Sound A&amp;R
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEpkComplete && !hasEnhancedEpk && (
        <div className="glass-panel rounded-3xl px-8 py-16 text-center">
          <div className="text-5xl mb-4">&#10024;</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Ready to Generate Your EPK
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Our AI will enhance your profile, research public information about
            you, and create a professional press kit.
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
