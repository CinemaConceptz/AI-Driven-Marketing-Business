import type { EpkProfile, SubscriptionTier } from "@/components/epk/types";

type Props = {
  profile: EpkProfile | null;
  tier: SubscriptionTier;
};

function generateHighlights(profile: EpkProfile | null, tier: SubscriptionTier): string[] {
  const highlights: string[] = [];
  const genres = profile?.genres?.length ? profile.genres : profile?.genre ? [profile.genre] : [];

  if (profile?.monthlyListeners) {
    const listeners = profile.monthlyListeners;
    if (listeners >= 1000000) highlights.push(`Commanding over ${(listeners / 1000000).toFixed(1)}M monthly listeners across streaming platforms`);
    else if (listeners >= 100000) highlights.push(`Building momentum with ${(listeners / 1000).toFixed(0)}K+ monthly listeners`);
    else if (listeners >= 10000) highlights.push(`Cultivating a dedicated fanbase of ${(listeners / 1000).toFixed(0)}K+ monthly listeners`);
  }

  if (profile?.recordLabel) highlights.push(`Currently signed to ${profile.recordLabel}`);

  if (genres.length > 0) {
    const genreList = genres.slice(0, 3).join(", ");
    highlights.push(tier === "tier3" ? `Pioneering a distinctive sound at the intersection of ${genreList}` : `Specializing in ${genreList}`);
  }

  if (profile?.audioTracks?.length) {
    const trackCount = profile.audioTracks.length;
    highlights.push(tier === "tier3" ? `${trackCount} original production${trackCount > 1 ? "s" : ""} ready for sync licensing and playlist consideration` : `${trackCount} track${trackCount > 1 ? "s" : ""} available for review`);
  }

  if (profile?.location && tier === "tier3") highlights.push(`Representing the ${profile.location} music scene with a global perspective`);

  if (tier === "tier3") {
    const socialLinks = [profile?.links?.spotify, profile?.links?.appleMusic, profile?.links?.youtube, profile?.links?.instagram || profile?.instagram].filter(Boolean);
    if (socialLinks.length >= 3) highlights.push("Active presence across major streaming and social platforms");
  }

  if (profile?.pressQuotes?.length && tier === "tier3") highlights.push(`Featured press coverage from ${profile.pressQuotes.length} publication${profile.pressQuotes.length > 1 ? "s" : ""}`);
  if (profile?.achievements?.length) profile.achievements.slice(0, 2).forEach(a => highlights.push(a));

  const minHighlights = tier === "tier3" ? 6 : 4;
  const genericHighlights = [
    "Crafting authentic, emotionally resonant music that connects with diverse audiences",
    "Available for live performances, studio sessions, and collaborative projects",
    "Committed to artistic excellence and continuous creative evolution",
    "Building a sustainable career through strategic partnerships and audience engagement",
    "Open to sync licensing opportunities for film, TV, and advertising",
    "Actively seeking playlist placements and promotional partnerships",
  ];

  let i = 0;
  while (highlights.length < minHighlights && i < genericHighlights.length) {
    highlights.push(genericHighlights[i]);
    i++;
  }
  return highlights.slice(0, minHighlights);
}

export default function EpkHighlights({ profile, tier }: Props) {
  const highlights = generateHighlights(profile, tier);
  const isPremium = tier === "tier3";
  const pressQuotes = profile?.pressQuotes || [];

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${isPremium ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" : "glass-panel"}`}
      data-testid="epk-highlights"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-semibold text-white ${isPremium ? "text-2xl" : "text-xl"}`} data-testid="epk-highlights-title">
          {isPremium ? "Career Highlights & Achievements" : "Highlights"}
        </h2>
        {isPremium && <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Key Selling Points</span>}
      </div>

      <div className={`grid gap-4 ${isPremium ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {highlights.map((highlight, index) => (
          <div key={index}
            className={`flex items-start gap-3 p-4 rounded-xl ${isPremium ? "bg-amber-500/5 border border-amber-500/10" : "bg-white/5 border border-white/10"}`}
            data-testid={`epk-highlight-${index}`}>
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isPremium ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
              <svg className={`w-3 h-3 ${isPremium ? "text-amber-400" : "text-emerald-400"}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className={`text-sm ${isPremium ? "text-slate-200" : "text-slate-300"}`}>{highlight}</p>
          </div>
        ))}
      </div>

      {isPremium && pressQuotes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="text-xs text-amber-400 uppercase tracking-wider mb-4">Press Coverage</h3>
          <div className="space-y-4">
            {pressQuotes.map((quote, index) => (
              <blockquote key={index} className="relative pl-4 border-l-2 border-amber-500/50">
                <p className="text-sm text-slate-300 italic">"{quote.quote}"</p>
                <cite className="block mt-2 text-xs text-amber-400 not-italic">— {quote.source}</cite>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-white/10">
        <p className={`text-sm ${isPremium ? "text-slate-300" : "text-slate-400"}`}>
          {isPremium 
            ? "This artist represents a compelling opportunity for playlist consideration, sync licensing, and strategic partnership development."
            : "Contact for booking inquiries, collaborations, and promotional opportunities."}
        </p>
      </div>
    </section>
  );
}
