"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { getPressMedia, type PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile } from "@/components/epk/types";
import EpkLayout from "@/components/epk/EpkLayout";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function EpkPage() {
  const { user, loading } = useAuth();
  const uid = useMemo(() => user?.uid ?? null, [user]);
  const [profile, setProfile] = useState<EpkProfile | null>(null);
  const [pressMedia, setPressMedia] = useState<PressMediaDoc | null>(null);
  const [status, setStatus] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!uid) {
      setProfile(null);
      setPressMedia(null);
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    let alive = true;

    const loadData = async () => {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const [profileSnap, mediaDoc] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getPressMedia(uid),
        ]);

        if (!alive) return;

        setProfile(profileSnap.exists() ? (profileSnap.data() as EpkProfile) : null);
        setPressMedia(mediaDoc);
        setStatus("ready");
      } catch (error: any) {
        if (!alive) return;
        setErrorMessage(error?.message ?? String(error));
        setStatus("error");
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [loading, uid]);

  if (loading) {
    return (
      <div className="glass-panel mx-auto w-full max-w-4xl rounded-3xl px-8 py-10 text-slate-200">
        Loading EPK...
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-slate-200"
          data-testid="epk-login-cta"
        >
          <p className="text-lg font-semibold text-white">Login required</p>
          <p className="mt-2 text-sm text-slate-200">
            Please sign in to view your EPK.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024]"
            data-testid="epk-login-button"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div
          className="glass-panel rounded-3xl px-8 py-10 text-red-200"
          data-testid="epk-error"
        >
          {errorMessage || "Unable to load EPK."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <EpkLayout profile={profile} pressMedia={pressMedia} uid={uid} />
    </div>
  );
}
