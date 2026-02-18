"use client";

import { useState } from "react";
import { User } from "firebase/auth";

type Props = {
  user: User;
  tier?: string;
};

export default function DownloadEpkButton({ user, tier = "tier1" }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);

    try {
      const token = await user.getIdToken();
      
      const response = await fetch("/api/pdf/epk", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

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
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getTierLabel = () => {
    switch (tier) {
      case "tier3":
        return "Branded PDF";
      case "tier2":
        return "Clean PDF";
      default:
        return "Basic PDF";
    }
  };

  const getTierDescription = () => {
    switch (tier) {
      case "tier3":
        return "Fully branded with custom colors and logo";
      case "tier2":
        return "Professional layout, no watermark";
      default:
        return "Basic layout with Verified Sound watermark";
    }
  };

  return (
    <div className="space-y-3" data-testid="download-epk-section">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Download PDF EPK</p>
          <p className="text-xs text-slate-400">{getTierDescription()}</p>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
          {getTierLabel()}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
          downloading
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
            Generating PDF...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF EPK
          </>
        )}
      </button>

      {tier === "tier1" && (
        <p className="text-xs text-center text-slate-500">
          Upgrade to Tier II or III for watermark-free PDFs
        </p>
      )}
    </div>
  );
}
