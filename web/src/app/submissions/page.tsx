"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

type Label = {
  id: string;
  name: string;
  genres: string[];
  submissionMethod: "email" | "webform" | "unknown" | string;
  submissionEmail?: string;
  submissionUrl?: string;
  website?: string;
  country?: string;
  tier?: string;
  notes?: string;
  matchScore?: number;
};

type Pitch = {
  artistName: string;
  genre: string;
  hookLine: string;
  shortPitch: string;
  mediumPitch: string;
  subjectLine: string;
  trackUrl: string;
  epkUrl: string;
  generatedAt: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export default function SubmissionsPage() {
  const { user, loading } = useAuth();
  const uid = useMemo(() => user?.uid ?? null, [user]);

  const [status, setStatus] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [recommendations, setRecommendations] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);

  const [generating, setGenerating] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const authedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const loadPitch = async () => {
    if (!user) return;
    const res = await authedFetch("/api/submissions/pitch", { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load pitch");
    setPitch(data?.pitch || null);
  };

  const loadRecommendations = async () => {
    if (!user) return;
    setLoadingRecs(true);
    try {
      const res = await authedFetch("/api/submissions/recommend", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load recommendations");
      setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!uid) {
      setStatus("ready");
      setPitch(null);
      setRecommendations([]);
      setSelectedLabel(null);
      setErrorMessage(null);
      return;
    }

    let alive = true;

    (async () => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        await Promise.all([loadPitch(), loadRecommendations()]);
        if (!alive) return;
        setStatus("ready");
      } catch (e: any) {
        if (!alive) return;
        setStatus("error");
        setErrorMessage(e?.message || "Failed to load submissions");
      }
    })();

    return () => {
      alive = false;
    };
  }, [loading, uid]);

  const generatePitch = async (forceRegenerate: boolean) => {
    if (!user) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const res = await authedFetch("/api/submissions/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate pitch");
      setPitch(data?.pitch || null);
      // Refresh recs too (in case user just generated EPK and now gets recs)
      await loadRecommendations();
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to generate pitch");
    } finally {
      setGenerating(false);
    }
  };

  const handleLabelClick = (label: Label) => {
    setSelectedLabel(label);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="glass-panel mx-auto w-full max-w-5xl rounded-3xl px-8 py-10 text-slate-200">
        Loading submissions...
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10 text-slate-200">
          <p className="text-lg font-semibold text-white">Login required</p>
          <p className="mt-2 text-sm text-slate-200">Please sign in to use submissions.</p>
          <Link href="/login" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="glass-panel rounded-3xl px-8 py-10 text-red-200">
          {errorMessage || "Unable to load submissions."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Submissions</h1>
            <p className="text-slate-400 text-sm mt-1">Generate a pitch and get label recommendations.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => generatePitch(false)}
              disabled={generating}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : pitch ? "Regenerate Pitch" : "Generate Pitch"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch Section */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your AI Pitch</h2>
            {pitch?.generatedAt && (
              <span className="text-xs text-slate-500">
                Updated {new Date(pitch.generatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {pitch ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Subject</p>
                  <button onClick={() => copyToClipboard(pitch.subjectLine)} className="text-xs text-emerald-300 hover:underline">
                    Copy
                  </button>
                </div>
                <p className="text-slate-100 mt-2">{pitch.subjectLine}</p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Hook</p>
                  <button onClick={() => copyToClipboard(pitch.hookLine)} className="text-xs text-emerald-300 hover:underline">
                    Copy
                  </button>
                </div>
                <p className="text-slate-200 mt-2">{pitch.hookLine}</p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Short Pitch</p>
                  <button onClick={() => copyToClipboard(pitch.shortPitch)} className="text-xs text-emerald-300 hover:underline">
                    Copy
                  </button>
                </div>
                <p className="text-slate-200 mt-2 whitespace-pre-wrap">{pitch.shortPitch}</p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Medium Pitch</p>
                  <button onClick={() => copyToClipboard(pitch.mediumPitch)} className="text-xs text-emerald-300 hover:underline">
                    Copy
                  </button>
                </div>
                <p className="text-slate-200 mt-2 whitespace-pre-wrap">{pitch.mediumPitch}</p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Links</p>
                <div className="mt-2 space-y-2 text-sm">
                  {pitch.trackUrl && (
                    <a className="text-emerald-300 hover:underline" href={pitch.trackUrl} target="_blank" rel="noreferrer">
                      Primary Track
                    </a>
                  )}
                  {pitch.epkUrl && (
                    <a className="text-emerald-300 hover:underline ml-4" href={pitch.epkUrl} target="_blank" rel="noreferrer">
                      EPK
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Generate Your Pitch</p>
                <p className="text-slate-400 text-sm mt-1">
                  AI will create a professional pitch using your EPK and uploaded music
                </p>
              </div>
              <button
                onClick={() => generatePitch(false)}
                disabled={generating}
                className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate AI Pitch"}
              </button>
            </div>
          )}
        </div>

        {/* Labels Section */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recommended Labels</h2>
            <span className="text-xs text-slate-500">Based on your EPK</span>
          </div>

          {/* EPK Required Notice */}
          {recommendations.length === 0 && !pitch && !loadingRecs && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">EPK Required</p>
                <p className="text-sm text-slate-400 mt-1">
                  Generate your AI-Enhanced EPK first to get personalized label recommendations
                </p>
              </div>
              <Link 
                href="/epk" 
                className="inline-block px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-full hover:bg-emerald-500 transition-colors"
              >
                Create Your EPK
              </Link>
            </div>
          )}

          {loadingRecs && (
            <div className="text-center py-8">
              <p className="text-slate-400">Loading recommendations...</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recommendations.map((label) => (
                <div
                  key={label.id}
                  onClick={() => handleLabelClick(label)}
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                >
                  <div>
                    <p className="text-white font-medium">{label.name}</p>
                    <p className="text-xs text-slate-400">
                      {label.genres.slice(0, 3).join(", ")}
                      {label.country && ` • ${label.country}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {label.matchScore && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        label.matchScore >= 75 ? "bg-emerald-500/20 text-emerald-300" :
                        label.matchScore >= 50 ? "bg-amber-500/20 text-amber-300" :
                        "bg-slate-500/20 text-slate-300"
                      }`}>
                        {label.matchScore}% match
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      label.submissionMethod === "email" 
                        ? "bg-emerald-500/20 text-emerald-300" 
                        : "bg-blue-500/20 text-blue-300"
                    }`}>
                      {label.submissionMethod === "email" ? "Email" : "Webform"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recommendations.length === 0 && pitch && !loadingRecs && (
            <div className="text-center py-8">
              <p className="text-slate-400">No matching labels found</p>
              <p className="text-sm text-slate-500 mt-1">Try adding more genres or check back later</p>
            </div>
          )}

          {selectedLabel && (
            <div className="mt-2 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-medium">{selectedLabel.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedLabel.genres.slice(0, 5).join(", ")}
                    {selectedLabel.country && ` • ${selectedLabel.country}`}
                  </p>
                </div>
                <button className="text-xs text-slate-400 hover:text-white" onClick={() => setSelectedLabel(null)}>
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-200">
                {selectedLabel.submissionEmail && (
                  <p>
                    <span className="text-slate-400">Email:</span>{" "}
                    <span className="text-emerald-300">{selectedLabel.submissionEmail}</span>
                  </p>
                )}
                {selectedLabel.submissionUrl && (
                  <p>
                    <span className="text-slate-400">Webform:</span>{" "}
                    <a className="text-emerald-300 hover:underline" href={selectedLabel.submissionUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </p>
                )}
                {selectedLabel.website && (
                  <p>
                    <span className="text-slate-400">Website:</span>{" "}
                    <a className="text-emerald-300 hover:underline" href={selectedLabel.website} target="_blank" rel="noreferrer">
                      Visit
                    </a>
                  </p>
                )}
                {selectedLabel.notes && (
                  <p className="text-xs text-slate-400 border-t border-white/10 pt-2">{selectedLabel.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
