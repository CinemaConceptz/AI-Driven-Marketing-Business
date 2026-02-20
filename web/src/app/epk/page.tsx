"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import Link from "next/link";
import EpkLayout from "@/components/epk/EpkLayout";
import { getAllPressMedia, type PressMediaDoc } from "@/services/pressMedia";

type UserProfile = {
  artistName?: string;
  displayName?: string;
  bio?: string;
  genre?: string;
  genres?: string[];
  location?: string;
  contactEmail?: string;
  email?: string;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  epkPublished?: boolean;
  epkSlug?: string;
  epkReady?: boolean;
};

export default function EpkPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [images, setImages] = useState<PressMediaItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/epk");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [userSnap, mediaItems] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getAllPressMedia(user.uid),
        ]);

        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }
        setImages(mediaItems);
      } catch (err) {
        console.error("Error loading EPK data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  // Check if EPK has all required fields
  const hasArtistName = !!profile?.artistName?.trim();
  const hasBio = !!profile?.bio?.trim();
  const hasGenre = !!(profile?.genres?.length || profile?.genre);
  const hasImage = images.length > 0;

  const isEpkComplete = hasArtistName && hasBio && hasGenre;
  const missingFields: string[] = [];
  if (!hasArtistName) missingFields.push("Artist Name");
  if (!hasBio) missingFields.push("Bio");
  if (!hasGenre) missingFields.push("Genre");
  if (!hasImage) missingFields.push("Press Image (recommended)");

  // Build EPK Handler
  const handleBuildEpk = async () => {
    if (!user || !isEpkComplete) return;

    setBuilding(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        epkReady: true,
        epkPublished: true,
      });
      setProfile((prev) =>
        prev ? { ...prev, epkReady: true, epkPublished: true } : prev,
      );
    } catch (err) {
      console.error("Error building EPK:", err);
    } finally {
      setBuilding(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading your EPK...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* EPK NOT READY WARNING BANNER */}
      {!profile?.epkReady && (
        <div className="sticky top-0 z-50 bg-red-600 border-b-2 border-red-700 px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-white text-lg">
                  EPK Not Created Yet
                </p>
                <p className="text-red-100 text-sm">
                  {isEpkComplete
                    ? "Your profile is complete! Click 'Build My EPK' to create your Electronic Press Kit."
                    : `Missing: ${missingFields.join(", ")}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEpkComplete ? (
                <Link
                  href="/settings"
                  className="px-5 py-2.5 bg-white text-red-600 font-semibold rounded-full hover:bg-red-50 transition-colors text-sm"
                >
                  Complete Profile →
                </Link>
              ) : (
                <button
                  onClick={handleBuildEpk}
                  disabled={building}
                  className="px-5 py-2.5 bg-white text-red-600 font-bold rounded-full hover:bg-red-50 transition-colors text-sm disabled:opacity-70"
                >
                  {building ? "Building..." : "🚀 Build My EPK"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EPK READY SUCCESS BANNER (shows briefly after building) */}
      {profile?.epkReady && profile?.epkPublished && (
        <div className="bg-emerald-600 border-b border-emerald-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <p className="text-white text-sm font-medium">
                Your EPK is live and ready to share!
              </p>
            </div>
            {profile.epkSlug && (
              <Link
                href={`/epk/${profile.epkSlug}`}
                target="_blank"
                className="text-xs text-emerald-100 hover:text-white underline"
              >
                View Public EPK →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* EPK Preview */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Your EPK Preview</h1>
          <p className="text-slate-400 text-sm mt-1">
            This is how labels and A&R reps will see your Electronic Press Kit.
          </p>
        </div>

        {/* Checklist for incomplete EPK */}
        {!isEpkComplete && (
          <div className="mb-8 p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <h3 className="font-semibold text-amber-300 mb-3">
              Complete your profile to build your EPK:
            </h3>
            <ul className="space-y-2">
              {[
                { field: "Artist Name", done: hasArtistName },
                { field: "Bio (Required)", done: hasBio },
                { field: "Genre", done: hasGenre },
                { field: "Press Image", done: hasImage, optional: true },
              ].map((item) => (
                <li
                  key={item.field}
                  className="flex items-center gap-2 text-sm"
                >
                  {item.done ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
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
              Go to Settings →
            </Link>
          </div>
        )}

        {/* EPK Layout Preview */}
        <div className={!isEpkComplete ? "opacity-50 pointer-events-none" : ""}>
          <EpkLayout
            artistName={
              profile?.artistName || profile?.displayName || "Your Name"
            }
            bio={profile?.bio || "Your bio will appear here..."}
            genre={profile?.genres?.join(", ") || profile?.genre || "Genre"}
            location={profile?.location}
            contactEmail={profile?.contactEmail || profile?.email}
            links={profile?.links}
            images={images}
          />
        </div>
      </div>
    </div>
  );
}
