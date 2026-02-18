"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0f1a] text-white">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-slate-400">{error.message}</p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold hover:bg-emerald-400"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/10"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
