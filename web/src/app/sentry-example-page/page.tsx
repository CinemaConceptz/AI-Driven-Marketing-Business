"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryTestPage() {
  const [triggered, setTriggered] = useState(false);

  const triggerError = () => {
    setTriggered(true);
    Sentry.captureException(new Error("Test error from Verified Sound A&R — Sentry is working!"));
    // Also trigger an unhandled error
    throw new Error("Sentry test: unhandled client error");
  };

  const triggerManual = () => {
    setTriggered(true);
    Sentry.captureMessage("Manual test message from verifiedsoundar.com", "info");
    alert("✅ Manual Sentry event sent! Check your Sentry dashboard.");
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-20 text-white">
      <h1 className="text-3xl font-bold">Sentry Test Page</h1>
      <p className="text-slate-400 text-sm">
        Use these buttons to verify Sentry error tracking is working in production.
        After clicking, check your{" "}
        <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
          Sentry dashboard
        </a>{" "}
        for the event.
      </p>

      <div className="flex flex-col gap-4">
        {/* Safe manual capture — won't crash the page */}
        <button
          onClick={triggerManual}
          className="rounded-full bg-emerald-500 px-6 py-3 font-semibold hover:bg-emerald-400 transition-colors"
        >
          ✅ Send Test Event (Safe — no crash)
        </button>

        {/* Throws an actual error — will show error boundary */}
        <button
          onClick={triggerError}
          className="rounded-full bg-red-500 px-6 py-3 font-semibold hover:bg-red-400 transition-colors"
        >
          💥 Trigger Real Error (Tests error boundary)
        </button>
      </div>

      {triggered && (
        <p className="text-sm text-emerald-400">
          Event sent! Check sentry.io → your project → Issues.
        </p>
      )}

      <p className="text-xs text-slate-600 mt-8">
        ⚠️ Remove or protect this page before going fully public.
      </p>
    </div>
  );
}
