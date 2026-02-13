"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import PressImageManager from "@/components/PressImageManager";
import PressImageThumb from "@/components/PressImageThumb";

export default function FirebaseTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function runFirestoreChecks() {
    if (!user?.uid) return;
    setBusy(true);
    setLog([]);
    const uid = user.uid;

    try {
      setLog((l) => [...l, "Auth OK: " + uid]);

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
        setLog((l) => [...l, "Created users/{uid} doc"]);
      } else {
        setLog((l) => [...l, "users/{uid} doc exists"]);
      }

      const pressRef = doc(db, "users", uid, "media", "press");
      await setDoc(
        pressRef,
        {
          title: "Press Image",
          caption: "",
          tags: [],
          sortOrder: 0,
          createdAt: serverTimestamp(),
          width: 0,
          height: 0,
          storagePath: "",
          downloadURL: "",
          contentType: "",
          sizeBytes: 0,
        },
        { merge: true }
      );
      setLog((l) => [...l, "Wrote users/{uid}/media/press (merge)"]);

      const pressSnap = await getDoc(pressRef);
      setLog((l) => [
        ...l,
        "Read users/{uid}/media/press OK: " +
          (pressSnap.exists() ? "exists" : "missing"),
      ]);
    } catch (e: any) {
      setLog((l) => [...l, "ERROR: " + (e?.message ?? String(e))]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10">
        <h1 className="text-3xl font-semibold text-white" data-testid="firebase-test-title">
          Firebase Test
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="firebase-test-subtitle">
          Validate private Firestore + Storage paths.
        </p>
      </div>

      {!user ? (
        <div
          className="glass-panel rounded-2xl px-6 py-5 text-sm text-slate-200"
          data-testid="firebase-test-locked"
        >
          <p className="font-semibold text-white">Not logged in</p>
          <p className="mt-1">Log in to test private Firestore + Storage paths.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel rounded-2xl px-6 py-5 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#021024] disabled:opacity-50"
                onClick={runFirestoreChecks}
                disabled={busy}
                data-testid="firebase-test-run-button"
              >
                Run Firestore checks
              </button>
              <div className="text-xs text-slate-200" data-testid="firebase-test-uid">
                UID: {user.uid}
              </div>
            </div>
            <div
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200"
              data-testid="firebase-test-log"
            >
              {log.length ? log.join("\n") : "No logs yet."}
            </div>
          </div>

          <div className="glass-panel rounded-2xl px-6 py-5 space-y-4">
            <p className="font-semibold text-white" data-testid="firebase-test-press-title">
              Press Image Flow
            </p>
            <PressImageManager user={user} />
            <div className="pt-2">
              <p className="text-xs text-slate-200" data-testid="firebase-test-thumb-label">
                Thumbnail render test:
              </p>
              <PressImageThumb uid={user.uid} size={140} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
