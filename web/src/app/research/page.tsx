"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

type ResearchResult = {
  labelName: string;
  found: boolean;
  confidence: "high" | "medium" | "low";
  data: {
    website: string | null;
    submissionUrl: string | null;
    submissionEmail: string | null;
    genres: string[];
    country: string | null;
    tier: string;
    acceptingDemos: string;
    requirements: string | null;
    notes: string | null;
  };
  sources: string;
};

export default function LabelResearchPage() {
  const { user } = useAuth();
  const [labelName, setLabelName] = useState("");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToDb, setAddingToDb] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelName.trim() || !user) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAddSuccess(false);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/labels/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          labelName: labelName.trim(),
          genre: genre.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Research failed");
      }

      setResult(data.research);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDatabase = async () => {
    if (!result || !user || !result.found) return;

    setAddingToDb(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      
      // Determine submission method
      let submissionMethod = "none";
      if (result.data.submissionEmail) {
        submissionMethod = "email";
      } else if (result.data.submissionUrl) {
        submissionMethod = "webform";
      }

      const response = await fetch("/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: result.labelName,
          genres: result.data.genres,
          submissionMethod,
          submissionEmail: result.data.submissionEmail,
          submissionUrl: result.data.submissionUrl,
          website: result.data.website,
          country: result.data.country,
          notes: `${result.data.notes || ""} | Requirements: ${result.data.requirements || "None specified"} | AI Confidence: ${result.confidence}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add label");
      }

      setAddSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to add to database");
    } finally {
      setAddingToDb(false);
    }
  };

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please log in to use the Label Research Assistant</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Label Research Assistant</h1>
        <p className="text-gray-400 mb-8">
          AI-powered research to find record label submission information
        </p>

        {/* Search Form */}
        <form onSubmit={handleResearch} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Label Name *</label>
              <input
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="e.g., Anjunadeep"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm text-gray-400 mb-1">Genre (optional)</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., House"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !labelName.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {loading ? "Researching..." : "Research"}
              </button>
            </div>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{result.labelName}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm ${result.found ? "text-green-400" : "text-red-400"}`}>
                    {result.found ? "Found" : "Not Found"}
                  </span>
                  <span className={`text-sm ${confidenceColor(result.confidence)}`}>
                    Confidence: {result.confidence}
                  </span>
                </div>
              </div>
              {result.found && !addSuccess && (
                <button
                  onClick={handleAddToDatabase}
                  disabled={addingToDb}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 rounded-lg font-medium transition-colors"
                >
                  {addingToDb ? "Adding..." : "Add to Database"}
                </button>
              )}
              {addSuccess && (
                <span className="px-4 py-2 bg-green-900/50 text-green-400 rounded-lg">
                  Added Successfully
                </span>
              )}
            </div>

            {result.found && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <InfoField label="Website" value={result.data.website} isLink />
                <InfoField label="Submission Page" value={result.data.submissionUrl} isLink />
                <InfoField label="Submission Email" value={result.data.submissionEmail} />
                <InfoField label="Country" value={result.data.country} />
                <InfoField label="Tier" value={result.data.tier} />
                <InfoField label="Accepting Demos" value={result.data.acceptingDemos} />
                <div className="md:col-span-2">
                  <InfoField label="Genres" value={result.data.genres?.join(", ")} />
                </div>
                <div className="md:col-span-2">
                  <InfoField label="Requirements" value={result.data.requirements} />
                </div>
                <div className="md:col-span-2">
                  <InfoField label="Notes" value={result.data.notes} />
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-zinc-700">
              <p className="text-xs text-gray-500">
                Source: {result.sources}
              </p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <h3 className="font-medium text-gray-300 mb-2">Tips for best results:</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>Enter the exact label name as it appears on streaming platforms</li>
            <li>Add a genre hint to help narrow down labels with similar names</li>
            <li>Always verify the AI results before adding to the database</li>
            <li>Check the submission URL manually to confirm it&apos;s current</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, isLink }: { label: string; value: string | null | undefined; isLink?: boolean }) {
  if (!value) {
    return (
      <div>
        <span className="text-sm text-gray-500">{label}</span>
        <p className="text-gray-600">Unknown</p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-sm text-gray-500">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-purple-400 hover:text-purple-300 truncate"
        >
          {value}
        </a>
      ) : (
        <p className="text-white">{value}</p>
      )}
    </div>
  );
}

