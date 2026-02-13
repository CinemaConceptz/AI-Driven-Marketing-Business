"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "@/providers/AuthProvider";
import { db, storage } from "@/lib/firebase";

type UserProfile = {
  tier?: string;
  status?: string;
  currentPeriodEnd?: {
    seconds?: number;
    nanoseconds?: number;
  } | string | number | null;
  monthlyCap?: string | number | null;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: {
    seconds?: number;
  } | string | number | null;
  subscriptionMonthlyCap?: string | number | null;
  applicationStatus?: string;
  applicationReviewNotes?: string | null;
};

type MediaItem = {
  name: string;
  url: string;
  storagePath: string;
  createdAt?: {
    seconds?: number;
  } | string | number | null;
};

type UploadItem = {
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
};

function formatDate(value?: UserProfile["currentPeriodEnd"] | UserProfile["subscriptionCurrentPeriodEnd"]) {
  if (!value) return "—";
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  }
  if (typeof value === "object" && "seconds" in value && value.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  return "—";
}

const applicationStatusCopy: Record<
  string,
  { title: string; description: string }
> = {
  new: {
    title: "Submission received",
    description: "Your intake is in review. We will follow up with next steps.",
  },
  reviewed: {
    title: "Under review",
    description: "Our A&R team is reviewing your materials and positioning.",
  },
  accepted: {
    title: "Accepted",
    description: "You have been accepted. We will schedule your kickoff call.",
  },
  declined: {
    title: "Not selected",
    description: "We are unable to proceed at this time. Thank you for sharing.",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pressImage, setPressImage] = useState<MediaItem | null>(null);
  const [upload, setUpload] = useState<UploadItem | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setStatus("ready");
      },
      (error) => {
        setErrorMessage(error.message);
        setStatus("error");
      }
    );

    return () => unsubscribe();
  }, [loading, user]);

  useEffect(() => {
    if (loading || !user) return;

    const mediaRef = doc(db, "users", user.uid, "media", "press-image");
    const unsubscribe = onSnapshot(mediaRef, (snapshot) => {
      if (snapshot.exists()) {
        setPressImage(snapshot.data() as MediaItem);
      } else {
        setPressImage(null);
      }
    });

    return () => unsubscribe();
  }, [loading, user]);

  const statusLabel = useMemo(() => {
    const rawStatus = profile?.subscriptionStatus ?? profile?.status;
    if (!rawStatus) return "Inactive";
    return rawStatus;
  }, [profile]);

  const tierLabel = profile?.subscriptionTier ?? profile?.tier ?? "—";
  const monthlyCapLabel = profile?.subscriptionMonthlyCap ?? profile?.monthlyCap ?? "—";
  const periodEndLabel = formatDate(
    profile?.subscriptionCurrentPeriodEnd ?? profile?.currentPeriodEnd
  );

  const applicationStatus = profile?.applicationStatus || "none";
  const applicationCopy = applicationStatusCopy[applicationStatus] || {
    title: "No submission yet",
    description: "Submit your intake to start the review process.",
  };

  const handleUpload = (file: File | null) => {
    if (!user || !file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Images must be under 10MB.");
      return;
    }

    setUploadError(null);
    const extension = file.name.split(".").pop() || "jpg";
    const storagePath = `users/${user.uid}/media/press-image.${extension}`;
    const storageRef = ref(storage, storagePath);

    setUpload({ name: file.name, progress: 0, status: "uploading" });

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUpload((prev) => (prev ? { ...prev, progress } : prev));
      },
      (error) => {
        setUpload((prev) =>
          prev ? { ...prev, status: "error", error: error.message } : prev
        );
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const mediaRef = doc(db, "users", user.uid, "media", "press-image");
        await setDoc(
          mediaRef,
          {
            name: file.name,
            url: downloadUrl,
            storagePath,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        setUpload((prev) => (prev ? { ...prev, status: "complete" } : prev));
      }
    );
  };

  if (!user && loading) {
    return (
      <div className="mx-auto w-full max-w-4xl" data-testid="dashboard-loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="dashboard-kicker"
        >
          Subscription overview
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-white"
          data-testid="dashboard-title"
        >
          Representation dashboard
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="dashboard-subtitle">
          Track your current representation tier and next steps.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          {
            label: "Tier",
            value: tierLabel,
            testId: "dashboard-tier-value",
          },
          {
            label: "Status",
            value: statusLabel,
            testId: "dashboard-status-value",
          },
          {
            label: "Current period end",
            value: periodEndLabel,
            testId: "dashboard-period-end-value",
          },
          {
            label: "Monthly cap",
            value: monthlyCapLabel,
            testId: "dashboard-cap-value",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-panel rounded-2xl px-6 py-6"
            data-testid={item.testId}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <h2
          className="text-2xl font-semibold text-white"
          data-testid="dashboard-application-status-title"
        >
          Application status
        </h2>
        <div className="mt-4" data-testid="dashboard-application-status">
          <p className="text-lg font-semibold text-white">
            {applicationCopy.title}
          </p>
          <p className="mt-2 text-sm text-slate-200" data-testid="dashboard-application-message">
            {applicationCopy.description}
          </p>
          {profile?.applicationReviewNotes && (
            <p
              className="mt-3 text-sm text-slate-200"
              data-testid="dashboard-application-review-notes"
            >
              Notes: {profile.applicationReviewNotes}
            </p>
          )}
        </div>
      </section>

      <section
        className="glass-panel rounded-3xl px-8 py-10"
        data-testid="dashboard-press-images-section"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-white">Press images</h2>
          <p className="text-sm text-slate-200">
            Upload a single press image (JPEG/PNG, max 10MB).
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
            className="text-sm text-slate-200"
            data-testid="dashboard-upload-input"
          />
          {uploadError && (
            <div
              className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              data-testid="dashboard-upload-error"
            >
              {uploadError}
            </div>
          )}
          {upload && (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              data-testid="dashboard-upload-progress"
            >
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>{upload.name}</span>
                <span>
                  {upload.status === "complete"
                    ? "Complete"
                    : upload.status === "error"
                    ? "Error"
                    : `${upload.progress}%`}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#6ee7ff] transition-all"
                  style={{ width: `${upload.progress}%` }}
                  data-testid="dashboard-upload-progress-bar"
                />
              </div>
              {upload.error && (
                <p className="mt-2 text-xs text-red-200">{upload.error}</p>
              )}
            </div>
          )}
          {!pressImage ? (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              data-testid="dashboard-media-placeholder"
            >
              No press image uploaded yet.
            </div>
          ) : (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
              data-testid="dashboard-media-item"
            >
              <img
                src={pressImage.url}
                alt={pressImage.name}
                className="h-52 w-full rounded-xl object-cover"
              />
              <p className="mt-3 text-sm text-slate-200">{pressImage.name}</p>
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-3xl px-8 py-10">
        <h2
          className="text-2xl font-semibold text-white"
          data-testid="dashboard-next-steps-title"
        >
          Next steps
        </h2>
        <ul
          className="mt-4 space-y-3 text-sm text-slate-200"
          data-testid="dashboard-next-steps-list"
        >
          <li>Share updated releases and campaign timelines.</li>
          <li>Confirm your positioning deck review call.</li>
          <li>Monitor outreach updates in weekly reporting.</li>
        </ul>
        {status === "error" && (
          <div
            className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="dashboard-error-alert"
          >
            {errorMessage}
          </div>
        )}
        {status === "ready" && !profile && (
          <div
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="dashboard-empty-alert"
          >
            No profile found yet. Submit your intake to get started.
          </div>
        )}
      </section>
    </div>
  );
}
