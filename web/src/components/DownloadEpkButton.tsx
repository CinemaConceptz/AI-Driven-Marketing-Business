"use client";

import { useState } from "react";
import { User } from "firebase/auth";

type Props = {
  user: User;
  tier?: string;
};

const TIER_INFO = {
  tier1: {
    label: "Basic PDF",
    description: "Clean layout with Verified Sound watermark",
    features: ["3-4 pages", "Basic layout", "Watermarked"],
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
  tier2: {
    label: "Professional PDF",
    description: "Enhanced design, no watermark, QR codes",
    features: ["5 pages", "Enhanced styling", "No watermark", "QR codes", "Cached"],
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  tier3: {
    label: "Premium PDF",
    description: "Fully branded with custom colors & logo",
    features: ["6-7 pages", "Custom branding", "Press quotes", "Highlights", "Cached", "Shareable"],
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
};

export default function DownloadEpkButton({ user, tier = "tier1" }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tierKey = (tier as keyof typeof TIER_INFO) || "tier1";
  const tierInfo = TIER_INFO[tierKey] || TIER_INFO.tier1;

  const handleDownload = async (forceRegenerate = false) => {
    setError(null);
    setSuccess(null);
    
    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setDownloading(true);
    }

    try {
      const token = await user.getIdToken();
      
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      
      if (forceRegenerate) {
        headers["x-force-regenerate"] = "true";
      }
      
      const response = await fetch("/api/pdf/epk", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

      // Check if it was cached
      const cacheStatus = response.headers.get("X-Cache");
      const genTime = response.headers.get("X-Generation-Time");
      
      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "EPK.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      if (cacheStatus === "HIT") {
        setSuccess("Downloaded from cache");
      } else if (genTime) {
        setSuccess(`Generated in ${genTime}`);
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
      setRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setError(null);
    setSuccess(null);
    setRegenerating(true);

    try {
      const token = await user.getIdToken();
      
      // Clear cache first
      await fetch("/api/pdf/epk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Then download fresh
      await handleDownload(true);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate PDF");
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="download-epk-section">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Download PDF EPK</h3>
          <p className="text-sm text-slate-400 mt-1">{tierInfo.description}</p>
        </div>
        <span className={`text-xs ${tierInfo.color} ${tierInfo.bgColor} px-3 py-1.5 rounded-full font-medium`}>
          {tierInfo.label}
        </span>
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-2">
        {tierInfo.features.map((feature, idx) => (
          <span
            key={idx}
            className="text-xs text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
          >
            {feature}
          </span>
        ))}
      </div>

      {/* Status Messages */}
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

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleDownload(false)}
          disabled={downloading || regenerating}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
            downloading || regenerating
              ? "bg-white/10 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
          }`}
          data-testid="download-epk-btn"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </>
          )}
        </button>

        {/* Regenerate button for Tier II & III */}
        {(tierKey === "tier2" || tierKey === "tier3") && (
          <button
            onClick={handleRegenerate}
            disabled={downloading || regenerating}
            className={`px-4 rounded-xl border transition-all ${
              downloading || regenerating
                ? "border-white/10 text-slate-500 cursor-not-allowed"
                : "border-white/20 text-white hover:bg-white/10"
            }`}
            title="Regenerate PDF with latest data"
            data-testid="regenerate-epk-btn"
          >
            {regenerating ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Upgrade nudge for Tier I — shown after successful download */}
      {tierKey === "tier1" && success && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs text-slate-300">
            Want a <span className="text-emerald-400 font-semibold">watermark-free PDF</span> with QR codes and enhanced layout?
          </p>
          <a
            href="/pricing"
            className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            Upgrade →
          </a>
        </div>
      )}
      {/* Static hint for Tier I before download */}
      {tierKey === "tier1" && !success && (
        <p className="text-xs text-center text-slate-500">
          Upgrade to <a href="/pricing" className="text-emerald-400 hover:underline">Tier II</a> for watermark-free PDFs with QR codes
        </p>
      )}
    </div>
  );
}
