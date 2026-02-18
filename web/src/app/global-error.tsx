"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
    <html>
      <body style={{ background: "#0a0f1a", color: "white", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem" }}>
        <h2>Application error</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>An unexpected error occurred. Please refresh the page.</p>
        <button
          onClick={reset}
          style={{ background: "#10b981", color: "white", border: "none", borderRadius: "999px", padding: "0.5rem 1.25rem", cursor: "pointer" }}
        >
          Refresh
        </button>
      </body>
    </html>
  );
}
