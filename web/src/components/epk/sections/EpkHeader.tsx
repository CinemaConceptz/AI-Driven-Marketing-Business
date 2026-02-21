import type { EpkProfile, SubscriptionTier } from "@/components/epk/types";

type Props = {
  profile: EpkProfile | null;
  uid: string;
  tier: SubscriptionTier;
};

// Professional genre display
function formatGenres(profile: EpkProfile | null): string {
  if (profile?.genres?.length) {
    return profile.genres.join(" • ");
  }
  return profile?.genre || "Genre Not Specified";
}

export default function EpkHeader({ profile, uid, tier }: Props) {
  const name = profile?.artistName || profile?.displayName || "Artist Name";
  const location = profile?.location || "";
  const genres = formatGenres(profile);
  const website = profile?.website || profile?.links?.website || "";
  const instagram = profile?.instagram || profile?.links?.instagram || "";
  const spotify = profile?.links?.spotify || "";
  const appleMusic = profile?.links?.appleMusic || "";
  const youtube = profile?.links?.youtube || "";
  const tiktok = profile?.links?.tiktok || "";

  const isPremium = tier === "tier3";
  const isPro = tier === "tier2" || tier === "tier3";

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${
        isPremium 
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" 
          : "glass-panel"
      }`}
      data-testid="epk-header"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1
            className={`font-bold tracking-tight ${
              isPremium ? "text-4xl sm:text-5xl text-white" : "text-3xl text-white"
            }`}
            data-testid="epk-artist-name"
          >
            {name}
          </h1>

          <p className="text-emerald-400 font-medium text-sm tracking-wide uppercase" data-testid="epk-genre">
            {genres}
          </p>

          {location && (
            <p className="text-slate-300 text-sm flex items-center gap-2" data-testid="epk-location">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </p>
          )}

          {isPro && profile?.monthlyListeners && (
            <p className="text-slate-400 text-sm">
              <span className="text-white font-semibold">{profile.monthlyListeners.toLocaleString()}</span> monthly listeners
            </p>
          )}
        </div>

        {isPremium && (profile?.recordLabel || profile?.management) && (
          <div className="text-right text-sm">
            {profile.recordLabel && (
              <p className="text-slate-400">
                <span className="text-amber-400 font-medium">{profile.recordLabel}</span>
              </p>
            )}
            {profile.management && (
              <p className="text-slate-500 text-xs mt-1">
                Management: {profile.management}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {spotify && (
          <a href={spotify} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 px-4 py-2 text-xs font-semibold text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors"
            data-testid="epk-spotify-link">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </a>
        )}

        {appleMusic && (
          <a href={appleMusic} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/30 px-4 py-2 text-xs font-semibold text-[#FA243C] hover:bg-[#FA243C]/30 transition-colors"
            data-testid="epk-apple-link">
            Apple Music
          </a>
        )}

        {youtube && (
          <a href={youtube} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#FF0000]/20 border border-[#FF0000]/30 px-4 py-2 text-xs font-semibold text-[#FF0000] hover:bg-[#FF0000]/30 transition-colors"
            data-testid="epk-youtube-link">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </a>
        )}

        {instagram && (
          <a href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@", "")}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#E4405F]/20 border border-[#E4405F]/30 px-4 py-2 text-xs font-semibold text-[#E4405F] hover:bg-[#E4405F]/30 transition-colors"
            data-testid="epk-instagram-link">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            Instagram
          </a>
        )}

        {tiktok && (
          <a href={tiktok} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            data-testid="epk-tiktok-link">
            TikTok
          </a>
        )}

        {website && (
          <a href={website} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            data-testid="epk-website-link">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
            Website
          </a>
        )}
      </div>
    </section>
  );
}
