"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  features?: string[];
  dismissible?: boolean;
  variant?: "banner" | "inline" | "card";
};

export default function UpgradeNudge({
  title,
  description,
  ctaLabel = "View upgrade options →",
  ctaHref = "/pricing",
  features = [],
  dismissible = true,
  variant = "banner",
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-300">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <Link
          href={ctaHref}
          className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-slate-900/40 px-6 py-6">
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <p className="font-semibold text-white">{title}</p>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
            {features.length > 0 && (
              <ul className="mt-3 space-y-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={ctaHref}
              className="mt-4 inline-flex rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default: banner
  return (
    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
      <div>
        <p className="text-sm font-semibold text-emerald-300">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <Link
        href={ctaHref}
        className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
