"use client";

import { useState } from "react";

export default function EmailTestPage() {
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<string>("");

  async function send() {
    setStatus("Sending...");
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: "Verified Sound A&R — Test Email",
          text: "If you received this, Postmark is connected correctly.",
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setStatus(`✅ Sent. MessageId: ${data.messageId || "(none)"}`);
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
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

        <button
          onClick={send}
          className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] disabled:opacity-50"
          disabled={!to}
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
