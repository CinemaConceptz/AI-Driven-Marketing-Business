"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import Link from "next/link";

const GENRES = [
  "House", "EDM", "Afro", "Disco", "Soulful", "Trance",
  "Hip-Hop", "R&B", "Pop", "Electronic", "Other",
];

const TOTAL_STEPS = 4;

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

  // Profile fields
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");

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
        if (userData?.genre) setGenre(userData.genre);
        if (userData?.bio) setBio(userData.bio);
      } catch (e) {
        console.error("Error checking onboarding status", e);
      } finally {
        setCheckingOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, [user, loading, router]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          artistName: artistName.trim() || null,
          genre: genre || null,
          bio: bio.trim() || null,
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
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
    await setDoc(
      doc(db, "users", user.uid),
      { onboardingCompleted: true, onboardingCompletedAt: serverTimestamp() },
      { merge: true }
    );
    router.push("/dashboard");
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400" data-testid="onboarding-step-indicator">
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
            <h1 className="text-3xl font-bold text-white">Welcome to Verified Sound A&R</h1>
            <p className="mt-3 text-slate-300">
              You&apos;re now part of an executive-grade representation platform built
              for label-ready artists. Let&apos;s get you set up in 3 quick steps.
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
            <h2 className="text-2xl font-bold text-white">Set up your artist profile</h2>
            <p className="mt-2 text-sm text-slate-400">
              This helps us personalize your EPK and A&R outreach. You can edit anytime.
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

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Primary Genre
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0a1628] px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Select your genre</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Short Bio <span className="text-slate-500">(optional)</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell A&R reps about your sound and career so far..."
                rows={3}
                maxLength={300}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
              <span className="text-xs text-slate-500 text-right">{bio.length}/300</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Choose Plan */}
      {step === 3 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Choose your plan</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start with any tier. You can upgrade anytime from your dashboard.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                tier: "Tier I",
                price: "$39/mo",
                desc: "EPK hosting, 3 press images, basic PDF, A&R review",
                highlight: false,
              },
              {
                tier: "Tier II",
                price: "$89/mo",
                desc: "Everything in Tier I + 10 images, priority review, strategy call",
                highlight: true,
              },
              {
                tier: "Tier III",
                price: "$139/mo",
                desc: "Everything in Tier II + dedicated A&R, label showcases, 24/7 support",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
                  plan.highlight
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{plan.tier}</span>
                    {plan.highlight && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">POPULAR</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.desc}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-400">{plan.price}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="w-full rounded-full bg-emerald-500 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              View full pricing & subscribe →
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Skip for now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="glass-panel rounded-3xl px-8 py-10 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
            🎵
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
            <p className="mt-3 text-slate-300">
              {artistName ? `Welcome, ${artistName}.` : "Welcome."} Your Verified Sound A&R profile is ready.
              Head to your dashboard to upload press images and download your EPK.
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
          >
            {saving ? "Saving..." : "Go to my dashboard →"}
          </button>
        </div>
      )}
    </div>
  );
}
