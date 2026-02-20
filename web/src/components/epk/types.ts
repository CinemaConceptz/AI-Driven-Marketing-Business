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
