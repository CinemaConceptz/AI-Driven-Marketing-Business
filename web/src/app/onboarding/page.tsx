"use client";

import dynamic from "next/dynamic";

// Dynamically import the conversational onboarding to avoid SSR issues
const ConversationalOnboarding = dynamic(
  () => import("@/components/onboarding/ConversationalOnboarding"),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-slate-400">Loading onboarding...</div>
      </div>
    )
  }
);

export default function OnboardingPage() {
  return <ConversationalOnboarding />;
}
