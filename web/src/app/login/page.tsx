"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics/trackEvent";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    // Track signup/login attempt
    trackEvent(mode === "signup" ? "signup_started" : "page_view", null, { page: "login", mode });

    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Track successful signup
        trackEvent("signup_completed", credential.user.uid, { method: "email" });
        
        try {
          const token = await credential.user.getIdToken();
          await fetch("/api/email/welcome", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
          console.error("Welcome email failed", err);
        }
        // New users always go to onboarding
        router.push("/onboarding");
        return;
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Check if existing user has completed onboarding
        const userDoc = await getDoc(doc(db, "users", credential.user.uid));
        const userData = userDoc.data();
        if (!userData?.onboardingCompleted) {
          router.push("/onboarding");
          return;
        }
      }
      router.push(redirectTo);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to authenticate. Please try again."
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="login-kicker"
        >
          Account access
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white" data-testid="login-title">
          {mode === "login" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="login-subtitle">
          Access your representation dashboard and billing status.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="glass-panel grid gap-6 rounded-3xl px-8 py-10"
        data-testid="login-form"
      >
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="login-email-input"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="login-password-input"
          />
        </label>
        {status === "error" && (
          <div
            className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="login-error-alert"
          >
            {errorMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-[#6ee7ff] px-6 py-3 text-sm font-semibold text-[#021024] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          data-testid="login-submit-button"
        >
          {status === "loading"
            ? "Processing..."
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>
        <button
          type="button"
          onClick={() =>
            setMode((prev) => (prev === "login" ? "signup" : "login"))
          }
          className="text-left text-sm text-slate-200 underline"
          data-testid="login-toggle-mode"
        >
          {mode === "login"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-4xl text-slate-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
