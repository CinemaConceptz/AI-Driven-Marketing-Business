"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "@/providers/AuthProvider";
import { db, storage } from "@/lib/firebase";

type StatusState = "idle" | "working" | "pass" | "fail";

export default function FirebaseTestPage() {
  const { user } = useAuth();
  const [docStatus, setDocStatus] = useState<StatusState>("idle");
  const [uploadStatus, setUploadStatus] = useState<StatusState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreateDoc = async () => {
    if (!user) {
      setDocStatus("fail");
      setMessage("Sign in to run the Firestore test.");
      return;
    }

    setDocStatus("working");
    setMessage(null);

    try {
      const mediaRef = doc(db, "users", user.uid, "media", "press-image");
      await setDoc(
        mediaRef,
        {
          testMetadataAt: serverTimestamp(),
        },
        { merge: true }
      );
      setDocStatus("pass");
    } catch (error) {
      setDocStatus("fail");
      setMessage(error instanceof Error ? error.message : "Firestore test failed.");
    }
  };

  const handleUpload = async () => {
    if (!user) {
      setUploadStatus("fail");
      setMessage("Sign in to run the Storage test.");
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
      const mediaRef = doc(db, "users", user.uid, "media", "press-image");
      await setDoc(
        mediaRef,
        {
          name: "press-image.png",
          url: downloadUrl,
          storagePath,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      setUploadStatus("pass");
    } catch (error) {
      setUploadStatus("fail");
      setMessage(error instanceof Error ? error.message : "Storage test failed.");
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
          {user ? `Signed in as ${user.email}` : "Not signed in"}
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Firestore test</h2>
              <p className="text-sm text-slate-200">Create a metadata document.</p>
            </div>
            <button
              onClick={handleCreateDoc}
              className="rounded-full bg-[#6ee7ff] px-5 py-3 text-sm font-semibold text-[#021024]"
              data-testid="firebase-test-firestore-button"
            >
              Run test
            </button>
          </div>
          <div
            className="text-sm text-slate-200"
            data-testid="firebase-test-firestore-status"
          >
            Status: {statusLabel(docStatus)}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Storage test</h2>
              <p className="text-sm text-slate-200">
                Upload a 1x1 PNG and write metadata.
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
          <div
            className="text-sm text-slate-200"
            data-testid="firebase-test-storage-status"
          >
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
