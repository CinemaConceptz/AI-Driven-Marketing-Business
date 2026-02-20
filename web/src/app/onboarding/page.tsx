"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics/trackEvent";
import Link from "next/link";

const GENRES = [
  "House",
  "EDM",
  "Afro",
  "Disco",
  "Soulful",
  "Trance",
  "Hip-Hop",
  "R&B",
  "Pop",
  "Electronic",
  "Techno",
  "Deep House",
  "Drum & Bass",
  "Dubstep",
  "Other",
];

const TOTAL_STEPS = 5;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all ${
            i < step ? "bg-emerald-400" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState<string | null>(null);

  // Profile fields
  const [artistName, setArtistName] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Social/Music links
  const [links, setLinks] = useState({
    spotify: "",
    soundcloud: "",
    bandcamp: "",
    appleMusic: "",
    instagram: "",
    youtube: "",
    website: "",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Check if user already completed onboarding - redirect to dashboard
  useEffect(() => {
    if (loading || !user) return;

    const checkOnboardingStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.onboardingCompleted) {
          router.replace("/dashboard");
          return;
        }
        // Pre-fill existing profile data if available
        if (userData?.artistName) setArtistName(userData.artistName);
        if (userData?.genres && Array.isArray(userData.genres)) {
          setSelectedGenres(userData.genres);
        } else if (userData?.genre) {
          setSelectedGenres([userData.genre]);
        }
        if (userData?.bio) setBio(userData.bio);
        if (userData?.links) {
          setLinks({
            spotify: userData.links.spotify || "",
            soundcloud: userData.links.soundcloud || "",
            bandcamp: userData.links.bandcamp || "",
            appleMusic: userData.links.appleMusic || "",
            instagram: userData.links.instagram || "",
            youtube: userData.links.youtube || "",
            website: userData.links.website || "",
          });
        }
      } catch (e) {
        console.error("Error checking onboarding status", e);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, router]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          artistName: artistName.trim() || null,
          genres: selectedGenres.length > 0 ? selectedGenres : null,
          genre: selectedGenres[0] || null, // Keep primary genre for backwards compatibility
          bio: bio.trim() || null,
          links: {
            spotify: links.spotify.trim() || null,
            soundcloud: links.soundcloud.trim() || null,
            bandcamp: links.bandcamp.trim() || null,
            appleMusic: links.appleMusic.trim() || null,
            instagram: links.instagram.trim() || null,
            youtube: links.youtube.trim() || null,
            website: links.website.trim() || null,
          },
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      // Track onboarding completion
      trackEvent("onboarding_completed", user.uid, {
        hasArtistName: !!artistName.trim(),
        genreCount: selectedGenres.length,
        hasBio: !!bio.trim(),
        hasLinks: !!(
          links.spotify ||
          links.soundcloud ||
          links.bandcamp ||
          links.appleMusic
        ),
      });
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    await saveProfile();
    router.push("/dashboard");
  };

  const skipToEnd = async () => {
    if (!user) return;
    // Track skip event
    trackEvent("onboarding_skipped", user.uid, { skippedAtStep: step });
    await setDoc(
      doc(db, "users", user.uid),
      { onboardingCompleted: true, onboardingCompletedAt: serverTimestamp() },
      { merge: true },
    );
    router.push("/dashboard");
  };

  // Track step changes
  const handleStepChange = (newStep: number) => {
    trackEvent("onboarding_step_completed", user?.uid, {
      step: step,
      nextStep: newStep,
    });
    setStep(newStep);
  };

  // Handle tier selection and checkout
  const handleSelectTier = async (tier: string) => {
    if (!user) return;
    setStartingCheckout(tier);

    try {
      // Save profile first
      await saveProfile();

      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          billingPeriod: "monthly",
        }),
      });

      const data = await response.json();

      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setStartingCheckout(null);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setStartingCheckout(null);
    }
  };

  if (loading || !user || checkingOnboarding) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p
            className="text-xs uppercase tracking-[0.2em] text-slate-400"
            data-testid="onboarding-step-indicator"
          >
            Step {step} of {TOTAL_STEPS}
          </p>
          <button
            onClick={skipToEnd}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            data-testid="onboarding-skip-button"
          >
            Skip setup →
          </button>
        </div>
        <ProgressBar step={step} />
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6">
          <div className="text-4xl">👋</div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome to Verified Sound A&R
            </h1>
            <p className="mt-3 text-slate-300">
              You&apos;re now part of an executive-grade representation platform
              built for label-ready artists. Let&apos;s get you set up in 3
              quick steps.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {[
              "Build your Artist EPK (Electronic Press Kit)",
              "Upload press images",
              "Connect with A&R representation",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setStep(2)}
            className="w-full rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors"
            data-testid="onboarding-get-started-button"
          >
            Get started →
          </button>
        </div>
      )}

      {/* Step 2: Profile Setup */}
      {step === 2 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Set up your artist profile
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              This helps us personalize your EPK and A&R outreach. You can edit
              anytime.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Artist / Stage Name
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. DJ Nova, Luna Waves"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                data-testid="onboarding-artist-name-input"
              />
            </label>

            {/* Multi-select Genre Checkboxes */}
            <div className="flex flex-col gap-2 text-sm text-slate-200">
              <span>
                Genres{" "}
                <span className="text-slate-500">(select all that apply)</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {GENRES.map((genre) => (
                  <label
                    key={genre}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedGenres.includes(genre)
                        ? "bg-emerald-500/20 border border-emerald-500/50"
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre)}
                      onChange={() => toggleGenre(genre)}
                      className="w-4 h-4 accent-emerald-500"
                      data-testid={`onboarding-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <span className="text-sm">{genre}</span>
                  </label>
                ))}
              </div>
              {selectedGenres.length > 0 && (
                <p className="text-xs text-emerald-400 mt-1">
                  Selected: {selectedGenres.join(", ")}
                </p>
              )}
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Bio <span className="text-slate-500">(optional)</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell A&R reps about your sound, career highlights, and what makes you unique..."
                rows={5}
                maxLength={900}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                data-testid="onboarding-bio-textarea"
              />
              <span
                className={`text-xs text-right ${bio.length > 800 ? "text-amber-400" : "text-slate-500"}`}
              >
                {bio.length}/900 characters
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              data-testid="onboarding-back-button"
            >
              ← Back
            </button>
            <button
              onClick={() => handleStepChange(3)}
              className="flex-1 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors"
              data-testid="onboarding-continue-button"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Music & Social Links */}
      {step === 3 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Add your music links
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Help labels find your music. These appear on your EPK and help A&R
              reps discover your sound.
            </p>
          </div>

          <div className="space-y-4">
            {/* Music Platforms */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Music Platforms
              </p>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-green-400">●</span> Spotify
                </span>
                <input
                  type="url"
                  value={links.spotify}
                  onChange={(e) =>
                    setLinks({ ...links, spotify: e.target.value })
                  }
                  placeholder="https://open.spotify.com/artist/..."
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-spotify-input"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-orange-400">●</span> SoundCloud
                </span>
                <input
                  type="url"
                  value={links.soundcloud}
                  onChange={(e) =>
                    setLinks({ ...links, soundcloud: e.target.value })
                  }
                  placeholder="https://soundcloud.com/your-profile"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-soundcloud-input"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-teal-400">●</span> Bandcamp
                </span>
                <input
                  type="url"
                  value={links.bandcamp}
                  onChange={(e) =>
                    setLinks({ ...links, bandcamp: e.target.value })
                  }
                  placeholder="https://yourname.bandcamp.com"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-bandcamp-input"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-pink-400">●</span> Apple Music
                </span>
                <input
                  type="url"
                  value={links.appleMusic}
                  onChange={(e) =>
                    setLinks({ ...links, appleMusic: e.target.value })
                  }
                  placeholder="https://music.apple.com/artist/..."
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-apple-music-input"
                />
              </label>
            </div>

            {/* Social Links */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Social Media <span className="text-slate-600">(optional)</span>
              </p>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-purple-400">●</span> Instagram
                </span>
                <input
                  type="url"
                  value={links.instagram}
                  onChange={(e) =>
                    setLinks({ ...links, instagram: e.target.value })
                  }
                  placeholder="https://instagram.com/yourhandle"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-instagram-input"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-red-400">●</span> YouTube
                </span>
                <input
                  type="url"
                  value={links.youtube}
                  onChange={(e) =>
                    setLinks({ ...links, youtube: e.target.value })
                  }
                  placeholder="https://youtube.com/@yourchannel"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-youtube-input"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="text-blue-400">●</span> Website
                </span>
                <input
                  type="url"
                  value={links.website}
                  onChange={(e) =>
                    setLinks({ ...links, website: e.target.value })
                  }
                  placeholder="https://yourwebsite.com"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  data-testid="onboarding-website-input"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => handleStepChange(4)}
              className="flex-1 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors"
              data-testid="onboarding-links-continue-button"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Choose Plan - WITH DIRECT TIER SELECTION */}
      {step === 4 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Choose your plan</h2>
            <p className="mt-2 text-sm text-slate-400">
              Select a tier to start your subscription. You can upgrade anytime.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                tier: "tier1",
                label: "Tier I",
                price: "$39/mo",
                desc: "EPK hosting, 3 press images, basic PDF, A&R review",
                highlight: false,
              },
              {
                tier: "tier2",
                label: "Tier II",
                price: "$89/mo",
                desc: "Everything in Tier I + 10 images, priority review, strategy call",
                highlight: true,
              },
              {
                tier: "tier3",
                label: "Tier III",
                price: "$139/mo",
                desc: "Everything in Tier II + dedicated A&R, label showcases, 24/7 support",
                highlight: false,
              },
            ].map((plan) => (
              <button
                key={plan.tier}
                onClick={() => handleSelectTier(plan.tier)}
                disabled={startingCheckout !== null}
                className={`w-full flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
                  plan.highlight
                    ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                } ${startingCheckout === plan.tier ? "opacity-70" : ""} disabled:cursor-wait`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {plan.label}
                    </span>
                    {plan.highlight && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm font-semibold text-emerald-400">
                    {plan.price}
                  </span>
                  {startingCheckout === plan.tier ? (
                    <span className="text-xs text-slate-400">Loading...</span>
                  ) : (
                    <span className="text-xs text-slate-500">Select →</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/pricing"
              className="w-full rounded-full border border-white/20 px-6 py-3 text-center text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              View full pricing details & annual plans →
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => handleStepChange(5)}
                className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Skip for now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
            🎵
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              You&apos;re all set!
            </h2>
            <p className="mt-3 text-slate-300">
              {artistName ? `Welcome, ${artistName}.` : "Welcome."} Your
              Verified Sound A&R profile is ready. Head to your dashboard to
              upload press images and download your EPK.
            </p>
          </div>
          <ul className="text-left space-y-2 text-sm text-slate-300">
            {[
              "Upload your press images",
              "Download your Artist EPK PDF",
              "Complete your subscription to unlock A&R review",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-emerald-400">→</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={completeOnboarding}
            disabled={saving}
            className="w-full rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors disabled:opacity-70"
            data-testid="onboarding-complete-button"
          >
            {saving ? "Saving..." : "Go to my dashboard →"}
          </button>
        </div>
      )}
    </div>
  );
}
