"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "@/providers/AuthProvider";
import { db, storage } from "@/lib/firebase";

type StatusState = "idle" | "working" | "pass" | "fail";

type MediaDoc = {
  id: string;
  name?: string;
  url?: string;
  storagePath?: string;
};

export default function FirebaseTestPage() {
  const { user, loading } = useAuth();
  const [userDocStatus, setUserDocStatus] = useState<StatusState>("idle");
  const [mediaDocStatus, setMediaDocStatus] = useState<StatusState>("idle");
  const [listenerStatus, setListenerStatus] = useState<StatusState>("idle");
  const [uploadStatus, setUploadStatus] = useState<StatusState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaDocs, setMediaDocs] = useState<MediaDoc[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setMediaDocs([]);
      setListenerStatus("idle");
      return;
    }

    const mediaCollection = collection(db, "users", user.uid, "media");
    const unsubscribe = onSnapshot(
      mediaCollection,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MediaDoc, "id">),
        }));
        setMediaDocs(docs);
        setListenerStatus("pass");
      },
      (error) => {
        setListenerStatus("fail");
        setMessage(error?.message ?? String(error));
      }
    );

    return () => unsubscribe();
  }, [loading, user]);

  const handleEnsureUserDoc = async () => {
    if (!user) {
      setUserDocStatus("fail");
      setMessage("Not logged in — cannot test private Firestore paths.");
      return;
    }

    setUserDocStatus("working");
    setMessage(null);

    try {
      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(
          userRef,
          {
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      setUserDocStatus("pass");
    } catch (error) {
      setUserDocStatus("fail");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateMediaDoc = async () => {
    if (!user) {
      setMediaDocStatus("fail");
      setMessage("Not logged in — cannot test private Firestore paths.");
      return;
    }

    setMediaDocStatus("working");
    setMessage(null);

    try {
      const mediaRef = doc(db, "users", user.uid, "media", "press");
      await setDoc(
        mediaRef,
        {
          name: "press",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMediaDocStatus("pass");
    } catch (error) {
      setMediaDocStatus("fail");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleUpload = async () => {
    if (!user) {
      setUploadStatus("fail");
      setMessage("Not logged in — cannot test private Firestore paths.");
      return;
    }

    setUploadStatus("working");
    setUploadProgress(0);
    setMessage(null);

    try {
      const dataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2cbY8AAAAASUVORK5CYII=";
      const blob = await (await fetch(dataUrl)).blob();
      const storagePath = `users/${user.uid}/media/press-image.png`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: "image/png",
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(progress);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      const mediaRef = doc(db, "users", user.uid, "media", "press");
      await setDoc(
        mediaRef,
        {
          name: "press-image.png",
          url: downloadUrl,
          storagePath,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setUploadStatus("pass");
    } catch (error) {
      setUploadStatus("fail");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const statusLabel = (status: StatusState) => {
    switch (status) {
      case "working":
        return "Running";
      case "pass":
        return "PASS";
      case "fail":
        return "FAIL";
      default:
        return "Idle";
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <h1 className="text-3xl font-semibold text-white" data-testid="firebase-test-title">
          Firebase Diagnostics
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="firebase-test-subtitle">
          Validate Auth, Firestore, and Storage access.
        </p>
        <div
          className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
          data-testid="firebase-test-auth-status"
        >
          {loading
            ? "Checking auth status..."
            : user
            ? `Signed in as ${user.email}`
            : "Not logged in — cannot test private Firestore paths"}
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">User doc test</h2>
              <p className="text-sm text-slate-200">Ensure users/{`{uid}`} exists.</p>
            </div>
            <button
              onClick={handleEnsureUserDoc}
              className="rounded-full bg-[#6ee7ff] px-5 py-3 text-sm font-semibold text-[#021024]"
              data-testid="firebase-test-userdoc-button"
            >
              Run test
            </button>
          </div>
          <div className="text-sm text-slate-200" data-testid="firebase-test-userdoc-status">
            Status: {statusLabel(userDocStatus)}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Media doc test</h2>
              <p className="text-sm text-slate-200">
                Write users/{`{uid}`}/media/press.
              </p>
            </div>
            <button
              onClick={handleCreateMediaDoc}
              className="rounded-full bg-[#6ee7ff] px-5 py-3 text-sm font-semibold text-[#021024]"
              data-testid="firebase-test-media-button"
            >
              Run test
            </button>
          </div>
          <div className="text-sm text-slate-200" data-testid="firebase-test-media-status">
            Status: {statusLabel(mediaDocStatus)}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Storage test</h2>
              <p className="text-sm text-slate-200">
                Upload press-image.png and store metadata.
              </p>
            </div>
            <button
              onClick={handleUpload}
              className="rounded-full bg-[#6ee7ff] px-5 py-3 text-sm font-semibold text-[#021024]"
              data-testid="firebase-test-storage-button"
            >
              Run test
            </button>
          </div>
          <div className="text-sm text-slate-200" data-testid="firebase-test-storage-status">
            Status: {statusLabel(uploadStatus)}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#6ee7ff] transition-all"
              style={{ width: `${uploadProgress}%` }}
              data-testid="firebase-test-storage-progress"
            />
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <h2 className="text-xl font-semibold text-white">Media listener output</h2>
        <p className="mt-2 text-sm text-slate-200" data-testid="firebase-test-listener-status">
          Listener status: {statusLabel(listenerStatus)}
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          {mediaDocs.length === 0 ? (
            <p data-testid="firebase-test-media-empty">No media docs found.</p>
          ) : (
            mediaDocs.map((docItem) => (
              <div
                key={docItem.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                data-testid={`firebase-test-media-${docItem.id}`}
              >
                <p>ID: {docItem.id}</p>
                <p>Name: {docItem.name || "—"}</p>
                <p>Storage: {docItem.storagePath || "—"}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {message && (
        <div
          className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          data-testid="firebase-test-error"
        >
          {message}
        </div>
      )}
    </div>
  );
}
