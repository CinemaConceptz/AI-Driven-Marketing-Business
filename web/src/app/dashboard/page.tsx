"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "@/providers/AuthProvider";
import { db, storage } from "@/lib/firebase";

type SubscriptionData = {
  tier?: string;
  status?: string;
  currentPeriodEnd?: {
    seconds?: number;
    nanoseconds?: number;
  } | string | number | null;
  monthlyCap?: string | number | null;
};

type ApplicationData = {
  status?: string;
  reviewNotes?: string | null;
  createdAt?: {
    seconds?: number;
  } | string | number | null;
};

type MediaItem = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  createdAt?: {
    seconds?: number;
  } | string | number | null;
};

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
};

function formatDate(value?: SubscriptionData["currentPeriodEnd"]) {
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
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    const subscriptionRef = doc(db, "subscriptions", user.uid);
    const unsubscribe = onSnapshot(
      subscriptionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSubscription(snapshot.data() as SubscriptionData);
        } else {
          setSubscription(null);
        }
        setStatus("ready");
      },
      (error) => {
        setErrorMessage(error.message);
        setStatus("error");
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const applicationsQuery = query(
      collection(db, "applications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      if (snapshot.empty) {
        setApplication(null);
      } else {
        const docData = snapshot.docs[0].data() as ApplicationData;
        setApplication(docData);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const mediaQuery = query(
      collection(db, "users", user.uid, "media"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      const items: MediaItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MediaItem, "id">),
      }));
      setMediaItems(items);
    });

    return () => unsubscribe();
  }, [user]);

  const statusLabel = useMemo(() => {
    if (!subscription?.status) return "Inactive";
    return subscription.status;
  }, [subscription]);

  const applicationStatus = application?.status || "new";
  const applicationCopy = applicationStatusCopy[applicationStatus] || {
    title: "Submission pending",
    description: "Submit your intake to start the review process.",
  };

  const handleUpload = (files: FileList | null) => {
    if (!user || !files || files.length === 0) return;

    setUploadError(null);

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are allowed.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Images must be under 10MB.");
        return;
      }

      const uploadId = crypto.randomUUID();
      const storagePath = `users/${user.uid}/media/${uploadId}-${file.name}`;
      const storageRef = ref(storage, storagePath);

      setUploads((prev) => [
        {
          id: uploadId,
          name: file.name,
          progress: 0,
          status: "uploading",
        },
        ...prev,
      ]);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, progress } : item
            )
          );
        },
        (error) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId
                ? { ...item, status: "error", error: error.message }
                : item
            )
          );
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "users", user.uid, "media"), {
            name: file.name,
            url: downloadUrl,
            storagePath,
            createdAt: serverTimestamp(),
          });
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, status: "complete" } : item
            )
          );
        }
      );
    });
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
            value: subscription?.tier || "—",
            testId: "dashboard-tier-value",
          },
          {
            label: "Status",
            value: statusLabel,
            testId: "dashboard-status-value",
          },
          {
            label: "Current period end",
            value: formatDate(subscription?.currentPeriodEnd),
            testId: "dashboard-period-end-value",
          },
          {
            label: "Monthly cap",
            value: subscription?.monthlyCap || "—",
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
          {application?.reviewNotes && (
            <p
              className="mt-3 text-sm text-slate-200"
              data-testid="dashboard-application-review-notes"
            >
              Notes: {application.reviewNotes}
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
            Upload high-resolution press images (JPEG/PNG, max 10MB).
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleUpload(event.target.files)}
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
          <div className="space-y-3">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                data-testid={`dashboard-upload-${upload.id}`}
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
                    data-testid={`dashboard-upload-progress-${upload.id}`}
                  />
                </div>
                {upload.error && (
                  <p className="mt-2 text-xs text-red-200">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
          {mediaItems.length === 0 ? (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              data-testid="dashboard-media-placeholder"
            >
              No press images uploaded yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  data-testid={`dashboard-media-item-${item.id}`}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-40 w-full rounded-xl object-cover"
                  />
                  <p className="mt-3 text-sm text-slate-200">{item.name}</p>
                </div>
              ))}
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
        {status === "ready" && !subscription && (
          <div
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            data-testid="dashboard-empty-alert"
          >
            No active subscription found. Visit pricing to activate a tier.
          </div>
        )}
      </section>
    </div>
  );
}
