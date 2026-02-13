"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import PressImageManager from "@/components/PressImageManager";

export default function MediaPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10">
        <h1 className="text-3xl font-semibold text-white" data-testid="media-title">
          Media
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="media-subtitle">
          Manage your press image and metadata.
        </p>
      </div>
      <PressImageManager user={user} />
    </main>
  );
}
