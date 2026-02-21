"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";

type Label = {
  id: string;
  name: string;
  genres: string[];
  matchScore?: number;
  submissionMethod: string;
  submissionEmail?: string;
  submissionUrl?: string;
  website?: string;
  country?: string;
};

type Submission = {
  id: string;
  labelName: string;
  status: string;
  createdAt: string;
  method: string;
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

type Stats = {
  total: number;
  thisMonth: number;
  remaining: number;
  limit: number;
  byStatus: Record<string, number>;
};

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"submit" | "history" | "labels">("submit");
  const [recommendations, setRecommendations] = useState<Label[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showWebformModal, setShowWebformModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/submissions");
    }
  }, [user, authLoading, router]);

  // Load data
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load in parallel
      const [pitchRes, historyRes, recommendRes] = await Promise.all([
        fetch("/api/submissions/pitch", { headers }),
        fetch("/api/submissions/history", { headers }),
        fetch("/api/submissions/recommend", { headers }),
      ]);

      // Process pitch
      if (pitchRes.ok) {
        const pitchData = await pitchRes.json();
        if (pitchData.pitch) {
          setPitch(pitchData.pitch);
        }
      }

      // Process history
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setSubmissions(historyData.submissions || []);
        setStats(historyData.stats || null);
      }

      // Process recommendations
      if (recommendRes.ok) {
        const recommendData = await recommendRes.json();
        setRecommendations(recommendData.recommendations || []);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generatePitch = async (force = false) => {
    if (!user) return;
    setGenerating(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/submissions/pitch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ forceRegenerate: force }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate pitch");
      }

      setPitch(data.pitch);
      setSuccess(data.cached ? "Using cached pitch" : "Pitch generated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to generate pitch");
    } finally {
      setGenerating(false);
    }
  };

  const handleLabelClick = (label: Label) => {
    if (!pitch) {
      setError("Please generate your pitch first");
      return;
    }

    // Check remaining limit
    if (stats && stats.remaining <= 0) {
      setError(`Monthly submission limit reached. Upgrade your tier for more submissions.`);
      return;
    }

    setSelectedLabel(label);
    
    if (label.submissionMethod === "email" && label.submissionEmail) {
      // Mode C: Direct email submission
      submitViaEmail(label);
    } else if (label.submissionUrl) {
      // Mode A: Webform guidance
      setShowWebformModal(true);
    } else {
      setError("This label doesn't have submission info available");
    }
  };

  const submitViaEmail = async (label: Label) => {
    if (!user || !pitch) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/submissions/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ labelId: label.id, pitchType: "medium" }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send submission");
      }

      setSuccess(`Submission sent to ${label.name}!`);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to send submission");
    } finally {
      setSubmitting(false);
      setSelectedLabel(null);
    }
  };

  const logWebformSubmission = async () => {
    if (!user || !selectedLabel) return;

    try {
      const token = await user.getIdToken();
      await fetch("/api/submissions/log-webform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ labelId: selectedLabel.id }),
      });

      setSuccess(`Submission to ${selectedLabel.name} logged!`);
      setShowWebformModal(false);
      setSelectedLabel(null);
      loadData();
    } catch {
      // Don't show error, just close modal
      setShowWebformModal(false);
      setSelectedLabel(null);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Label Submissions</h1>
          <p className="text-slate-400 mt-1">Submit your music directly to A&R contacts</p>
        </div>
        {stats && (
          <div className="text-right">
            <p className="text-sm text-slate-400">Monthly Submissions</p>
            <p className="text-2xl font-bold text-white">
              {stats.thisMonth} <span className="text-slate-500">/ {stats.limit}</span>
            </p>
            <p className="text-xs text-emerald-400">{stats.remaining} remaining</p>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: "submit", label: "Submit" },
          { id: "history", label: "History" },
          { id: "labels", label: "Add Label" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submit Tab */}
      {activeTab === "submit" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pitch Section */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Pitch</h2>
              <button
                onClick={() => generatePitch(!pitch)}
                disabled={generating}
                className="text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
              >
                {generating ? "Generating..." : pitch ? "Regenerate" : "Generate Pitch"}
              </button>
            </div>

            {pitch ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hook (10 words)</p>
                  <p className="text-white font-medium">{pitch.hookLine}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subject Line</p>
                  <p className="text-slate-300">{pitch.subjectLine}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Short Pitch (20 words)</p>
                  <p className="text-slate-300 text-sm">{pitch.shortPitch}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Medium Pitch (40 words)</p>
                  <p className="text-slate-300 text-sm">{pitch.mediumPitch}</p>
                </div>
                <div className="pt-2 border-t border-white/10 text-xs text-slate-500">
                  Generated {new Date(pitch.generatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Generate an AI-powered pitch based on your profile</p>
                <button
                  onClick={() => generatePitch(false)}
                  disabled={generating}
                  className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Pitch"}
                </button>
              </div>
            )}
          </div>

          {/* Labels Section */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recommended Labels</h2>
              <span className="text-xs text-slate-500">Based on your genre</span>
            </div>

            {recommendations.length > 0 ? (
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
                        {label.genres.join(", ")}
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
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recommendations yet</p>
                <p className="text-sm text-slate-500 mt-1">Add your genre in your profile to get matches</p>
                <Link href="/settings" className="text-emerald-400 text-sm hover:underline mt-2 inline-block">
                  Update Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Submission History</h2>
          
          {submissions.length > 0 ? (
            <div className="space-y-2">
              {submissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <p className="text-white font-medium">{sub.labelName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(sub.createdAt).toLocaleDateString()} via {sub.method}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    sub.status === "sent" || sub.status === "delivered" ? "bg-emerald-500/20 text-emerald-300" :
                    sub.status === "opened" || sub.status === "replied" ? "bg-blue-500/20 text-blue-300" :
                    sub.status === "failed" || sub.status === "bounced" ? "bg-red-500/20 text-red-300" :
                    "bg-slate-500/20 text-slate-300"
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No submissions yet</p>
          )}
        </div>
      )}

      {/* Add Label Tab */}
      {activeTab === "labels" && (
        <AddLabelForm onSuccess={() => { setActiveTab("submit"); loadData(); }} />
      )}

      {/* Webform Modal (Mode A) */}
      {showWebformModal && selectedLabel && pitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Submit to {selectedLabel.name}
              </h2>
              <button 
                onClick={() => { setShowWebformModal(false); setSelectedLabel(null); }}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
                <p className="text-sm text-blue-200">
                  <strong>Mode A: Assisted Submission</strong><br/>
                  Copy your pitch content below and paste it into the label&apos;s submission form.
                </p>
              </div>

              {/* Open Form Button */}
              <a
                href={selectedLabel.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Submission Form
              </a>

              {/* Copyable Fields */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Copy Your Pitch Content</p>

                {/* Subject Line */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Subject Line</span>
                    <button
                      onClick={() => copyToClipboard(pitch.subjectLine, "subject")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "subject" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white text-sm">{pitch.subjectLine}</p>
                </div>

                {/* Hook Pitch */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Hook (10 words)</span>
                    <button
                      onClick={() => copyToClipboard(pitch.hookLine, "hook")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "hook" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white text-sm font-medium">{pitch.hookLine}</p>
                </div>

                {/* Short Pitch */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Short Pitch (20 words)</span>
                    <button
                      onClick={() => copyToClipboard(pitch.shortPitch, "short")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "short" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{pitch.shortPitch}</p>
                </div>

                {/* Medium Pitch */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Medium Pitch (40 words)</span>
                    <button
                      onClick={() => copyToClipboard(pitch.mediumPitch, "medium")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "medium" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{pitch.mediumPitch}</p>
                </div>

                {/* Track URL */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Track Link</span>
                    <button
                      onClick={() => copyToClipboard(pitch.trackUrl, "track")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "track" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-emerald-400 text-sm break-all">{pitch.trackUrl}</p>
                </div>

                {/* EPK URL */}
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">EPK Link</span>
                    <button
                      onClick={() => copyToClipboard(pitch.epkUrl, "epk")}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedField === "epk" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-emerald-400 text-sm break-all">{pitch.epkUrl}</p>
                </div>
              </div>

              {/* Mark as Submitted */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  onClick={logWebformSubmission}
                  className="w-full rounded-full bg-white/10 py-3 text-sm font-medium text-white hover:bg-white/20"
                >
                  Mark as Submitted
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Click after you&apos;ve completed the form to track this submission
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Label Form Component
function AddLabelForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [genres, setGenres] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          submissionMethod: "email",
          submissionEmail: email,
          genres: genres.split(",").map(g => g.trim()).filter(Boolean),
          website,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add label");
      }

      // Reset form and notify parent
      setName("");
      setEmail("");
      setGenres("");
      setWebsite("");
      setNotes("");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to add label");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 max-w-xl">
      <h2 className="text-lg font-semibold text-white mb-4">Add a Label</h2>
      <p className="text-sm text-slate-400 mb-6">
        Add a label that&apos;s not in our database. Once added, it will appear in your recommendations.
      </p>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Label Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            placeholder="e.g. Defected Records"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Submission Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            placeholder="demos@label.com"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Genres (comma separated)</label>
          <input
            type="text"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            placeholder="House, Tech House, Deep House"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            placeholder="https://label.com"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
            placeholder="Any notes about submission requirements..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Label"}
        </button>
      </form>
    </div>
  );
}
