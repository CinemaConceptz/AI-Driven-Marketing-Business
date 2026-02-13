"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

export default function ApplySuccessPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<"checking" | "paid" | "pending">("checking");

  const sessionId = searchParams.get("session_id");

  const checkPayment = async () => {
    if (!user) {
      setStatus("pending");
      return;
    }
    const snap = await getDoc(doc(db, "users", user.uid));
    const paid = snap.data()?.paymentStatus === "paid";
    setStatus(paid ? "paid" : "pending");
  };

  useEffect(() => {
    checkPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10" data-testid="apply-success-page">
        <h1 className="text-2xl font-semibold text-white">Payment confirmed</h1>
        <p className="mt-3 text-sm text-slate-200">
          {status === "paid"
            ? "Your submission payment is confirmed. You can now complete the intake form."
            : "Payment is still processing. Refresh in a moment."}
        </p>
        {sessionId && (
          <p className="mt-2 text-xs text-slate-400" data-testid="apply-success-session">
            Session: {sessionId}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={checkPayment}
            className="inline-flex rounded-full border border-white/20 px-6 py-3 text-xs font-semibold text-white"
            data-testid="apply-success-refresh"
          >
            Refresh status
          </button>
          <a
            href="/apply"
            className="inline-flex rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#021024]"
            data-testid="apply-success-cta"
          >
            Go to intake
          </a>
        </div>
      </div>
    </div>
  );
}
