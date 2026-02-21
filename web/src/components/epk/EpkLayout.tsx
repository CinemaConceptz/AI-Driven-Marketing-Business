import type { PressMediaDoc } from "@/services/pressMedia";
import type { EpkProfile, SubscriptionTier } from "@/components/epk/types";
import EpkHeader from "@/components/epk/sections/EpkHeader";
import EpkPressImage from "@/components/epk/sections/EpkPressImage";
import EpkBio from "@/components/epk/sections/EpkBio";
import EpkContact from "@/components/epk/sections/EpkContact";
import EpkMusic from "@/components/epk/sections/EpkMusic";
import EpkHighlights from "@/components/epk/sections/EpkHighlights";

type Props = {
  profile: EpkProfile | null;
  pressMedia: PressMediaDoc[];
  uid: string;
};

// Determine effective tier (default to tier1 if active subscription)
function getEffectiveTier(profile: EpkProfile | null): SubscriptionTier {
  if (!profile) return "free";
  if (profile.subscriptionStatus !== "active") return "free";
  return profile.subscriptionTier || "tier1";
}

// Get tier display name
function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case "tier3": return "Premium EPK";
    case "tier2": return "Professional EPK";
    case "tier1": return "Essential EPK";
    default: return "Basic EPK";
  }
}

// Get number of bio paragraphs by tier
export function getBioParagraphCount(tier: SubscriptionTier): number {
  switch (tier) {
    case "tier3": return 6;
    case "tier2": return 4;
    case "tier1": return 2;
    default: return 1;
  }
}

// Get number of image placeholders by tier
export function getImagePlaceholderCount(tier: SubscriptionTier): number {
  switch (tier) {
    case "tier3": return 3;
    case "tier2": return 5;
    case "tier1": return 1;
    default: return 1;
  }
}

export default function EpkLayout({ profile, pressMedia, uid }: Props) {
  const tier = getEffectiveTier(profile);
  const tierLabel = getTierLabel(tier);
  const showMusic = tier === "tier1" || tier === "tier2" || tier === "tier3"; // All paid tiers get music
  const showHighlights = tier === "tier2" || tier === "tier3";
  const showFullContact = tier === "tier3";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Tier Badge */}
      <div className="flex justify-end">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          tier === "tier3" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" :
          tier === "tier2" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" :
          tier === "tier1" ? "bg-slate-600 text-white" :
          "bg-slate-700 text-slate-300"
        }`}>
          {tierLabel}
        </span>
      </div>

      <EpkHeader profile={profile} uid={uid} tier={tier} />
      <EpkPressImage pressMedia={pressMedia} tier={tier} />
      <EpkBio profile={profile} tier={tier} />
      
      {/* Music Section - Tier 2 & 3 only */}
      {showMusic && (
        <EpkMusic profile={profile} tier={tier} />
      )}
      
      {/* Highlights Section - Tier 2 & 3 only */}
      {showHighlights && (
        <EpkHighlights profile={profile} tier={tier} />
      )}
      
      <EpkContact profile={profile} tier={tier} showFull={showFullContact} />
    </div>
  );
}
