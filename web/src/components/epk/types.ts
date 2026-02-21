export type AudioTrack = {
  id: string;
  name: string;
  url: string;
  duration?: number;
  uploadedAt: string;
};

export type SubscriptionTier = "tier1" | "tier2" | "tier3" | "free";

export type EpkContent = {
  tagline?: string;
  styleDescription?: string;
  artistOverview?: string;
  shortPressBio?: string;
  strategicPositioning?: string;
  labelPitchParagraph?: string;
  highlights?: string[];
  achievements?: string[];
  pressQuotes?: { source: string; quote: string }[];
  representationSnapshot?: {
    genre?: string;
    yearsActive?: number;
    releaseCount?: number;
    targetMarket?: string;
    contractStatus?: string;
    recommendedTier?: string;
  };
};

export type EpkProfile = {
  displayName?: string;
  artistName?: string;
  bio?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  location?: string;
  genre?: string;
  genres?: string[];
  epkReady?: boolean;
  epkPublished?: boolean;
  epkSlug?: string;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: "active" | "inactive";
  audioTracks?: AudioTrack[];
  monthlyListeners?: number;
  recordLabel?: string;
  management?: string;
  publicist?: string;
  bookingAgent?: string;
  achievements?: string[];
  pressQuotes?: { source: string; quote: string }[];
  epkEnhanced?: boolean;
  epkContent?: EpkContent;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
    tiktok?: string;
    twitter?: string;
  };
};
