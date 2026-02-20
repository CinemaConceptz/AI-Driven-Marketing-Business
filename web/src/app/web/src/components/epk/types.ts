export type EpkContent = {
  enhancedBio: string;
  tagline: string;
  pressRelease: string;
  highlights: string[];
  styleDescription: string;
  generatedAt?: string;
  publicInfoFound?: boolean;
};

export type EpkProfile = {
  displayName?: string;
  artistName?: string;
  bio?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  location?: string;
  genre?: string;
  genres?: string[];
  epkReady?: boolean;
  epkPublished?: boolean;
  epkSlug?: string;
  epkEnhanced?: boolean;
  epkContent?: EpkContent;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
};
