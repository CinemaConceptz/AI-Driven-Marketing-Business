"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

type FormState = {
  name: string;
  email: string;
  genre: string;
  links: string;
  goals: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  genre: "",
  links: "",
  goals: "",
};

export default function ApplyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAuthenticated = Boolean(user);
  const [formState, setFormState] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setStatus("error");
      setErrorMessage("Please sign in to submit your intake.");
      router.push("/login?next=/apply");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      await addDoc(collection(db, "applications"), {
        ...formState,
        uid: user.uid,
        status: "new",
        reviewNotes: null,
        createdAt: serverTimestamp(),
      });
      setStatus("success");
      setFormState(initialState);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit. Please try again."
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="apply-kicker"
        >
          Artist intake
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white" data-testid="apply-title">
          Submit your representation request
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200" data-testid="apply-subtitle">
          Share your details, release focus, and goals. We review every intake
          with a placement-first lens.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="glass-panel grid gap-6 rounded-3xl px-8 py-10"
        data-testid="apply-form"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Name
            <input
              name="name"
              value={formState.name}
              onChange={handleChange}
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              data-testid="apply-name-input"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              data-testid="apply-email-input"
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Genre / Focus
          <input
            name="genre"
            value={formState.genre}
            onChange={handleChange}
            placeholder="House / EDM / Disco / Afro / Soulful / Trance"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-genre-input"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Links (Spotify, SoundCloud, socials)
          <input
            name="links"
            value={formState.links}
            onChange={handleChange}
            placeholder="https://"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-links-input"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Representation goals
          <textarea
            name="goals"
            value={formState.goals}
            onChange={handleChange}
            rows={5}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            data-testid="apply-goals-textarea"
          />
        </label>
        {status === "success" && (
          <div
            className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            data-testid="apply-success-alert"
          >
            Intake received. We will follow up with next steps.
          </div>
        )}
        {status === "error" && (
          <div
            className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="apply-error-alert"
          >
            {errorMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-full bg-[#6ee7ff] px-6 py-3 text-sm font-semibold text-[#021024] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          data-testid="apply-submit-button"
        >
          {status === "loading" ? "Submitting..." : "Submit intake"}
        </button>
      </form>
    </div>
  );
}
