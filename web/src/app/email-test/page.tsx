"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function EmailTestPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<string>("");
  const [key, setKey] = useState("");

  useEffect(() => {
    const queryKey = searchParams.get("key");
    if (queryKey) {
      setKey(queryKey);
    }
  }, [searchParams]);

  async function send() {
    if (!key) {
      setStatus("❌ Missing test key.");
      return;
    }

    setStatus("Sending...");
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-test-key": key,
        },
        body: JSON.stringify({ to }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { ok: false, error: await res.text() };

      if (!data.ok) throw new Error(data.error || "Failed");
      setStatus(`✅ Sent. MessageId: ${data.messageId || "(none)"}`);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  }

  if (!loading && !user && !key) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4">
        <div className="glass-panel rounded-3xl px-8 py-8 text-slate-200">
          <p className="text-lg font-semibold text-white" data-testid="email-test-locked">
            Email test is restricted.
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Log in or provide ?key= in the URL.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4">
      <div className="glass-panel rounded-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold text-white" data-testid="email-test-title">
          Email Test (Postmark)
        </h1>
        <p className="mt-2 text-sm text-slate-200" data-testid="email-test-subtitle">
          Send a quick verification email from the server-only Postmark route.
        </p>
      </div>

      <div className="glass-panel rounded-3xl px-8 py-8 text-slate-200 space-y-3">
        <label className="block text-sm font-medium text-white" htmlFor="email-to">
          Send To
        </label>
        <input
          id="email-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="you@domain.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          data-testid="email-test-to-input"
        />

        <label className="block text-sm font-medium text-white" htmlFor="email-key">
          Test Key
        </label>
        <input
          id="email-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="EMAIL_TEST_KEY"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          data-testid="email-test-key-input"
        />

        <button
          onClick={send}
          className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] disabled:opacity-50"
          disabled={!to || !key}
          data-testid="email-test-send-button"
        >
          Send test email
        </button>

        <div className="text-sm opacity-80" data-testid="email-test-status">
          {status}
        </div>
      </div>
    </main>
  );
}
