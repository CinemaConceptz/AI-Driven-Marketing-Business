import Link from "next/link";
import type { EpkProfile, SubscriptionTier } from "@/components/epk/types";
import { getBioParagraphCount, getImagePlaceholderCount } from "@/components/epk/EpkLayout";

type Props = {
  profile: EpkProfile | null;
  tier: SubscriptionTier;
};

function splitBioIntoParagraphs(bio: string, targetCount: number): string[] {
  if (!bio) return [];
  let paragraphs = bio.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length < targetCount) {
    paragraphs = bio.split(/\n+/).filter(p => p.trim());
  }
  if (paragraphs.length < targetCount && paragraphs.length > 0) {
    const fullText = paragraphs.join(" ");
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
    const sentencesPerParagraph = Math.ceil(sentences.length / targetCount);
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
      paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(" ").trim());
    }
  }
  return paragraphs.slice(0, targetCount);
}

function getBioSectionTitle(tier: SubscriptionTier): string {
  switch (tier) {
    case "tier3": return "Artist Biography";
    case "tier2": return "About the Artist";
    default: return "Bio";
  }
}

function getIntroText(profile: EpkProfile | null, tier: SubscriptionTier): string | null {
  if (tier === "free" || tier === "tier1") return null;
  const name = profile?.artistName || profile?.displayName || "This artist";
  const genres = profile?.genres?.length ? profile.genres.join(", ") : profile?.genre || "contemporary music";
  const location = profile?.location || "";

  if (tier === "tier3") {
    return `${name} represents the cutting edge of ${genres.toLowerCase()}, delivering a sonic experience that resonates with audiences worldwide.${location ? ` Based in ${location}, ${name.split(" ")[0]} has cultivated a distinctive sound that pushes creative boundaries while maintaining commercial appeal.` : ""}`;
  }
  if (tier === "tier2") {
    return `${name} is an emerging force in ${genres.toLowerCase()}${location ? `, hailing from ${location}` : ""}.`;
  }
  return null;
}

export default function EpkBio({ profile, tier }: Props) {
  const paragraphCount = getBioParagraphCount(tier);
  const imageCount = getImagePlaceholderCount(tier);
  const sectionTitle = getBioSectionTitle(tier);
  const introText = getIntroText(profile, tier);
  const paragraphs = splitBioIntoParagraphs(profile?.bio || "", paragraphCount);
  const isPremium = tier === "tier3";
  const isPro = tier === "tier2" || tier === "tier3";

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${isPremium ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" : "glass-panel"}`}
      data-testid="epk-bio"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-semibold text-white ${isPremium ? "text-2xl" : "text-xl"}`} data-testid="epk-bio-title">
          {sectionTitle}
        </h2>
        {isPremium && (
          <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Press Release Ready</span>
        )}
      </div>

      {profile?.bio ? (
        <div className="space-y-6">
          {introText && (
            <p className={`text-lg leading-relaxed ${isPremium ? "text-white font-medium" : "text-slate-200 italic"}`}>
              {introText}
            </p>
          )}

          <div className={`space-y-4 ${isPro ? "columns-1 md:columns-1" : ""}`}>
            {paragraphs.map((paragraph, index) => (
              <p key={index}
                className={`text-sm leading-relaxed ${isPremium ? "text-slate-200" : index === 0 ? "text-slate-100" : "text-slate-300"}`}
                data-testid={`epk-bio-paragraph-${index}`}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500">
              {paragraphs.length} of {paragraphCount} paragraphs • {tier === "tier3" ? "Full biography" : tier === "tier2" ? "Extended bio" : "Standard bio"}
            </p>
          </div>

          {imageCount > 0 && (
            <div className="mt-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                {isPremium ? "Press Photos" : "Featured Image"}
              </p>
              <div className={`grid gap-4 ${imageCount === 3 ? "grid-cols-3" : imageCount === 2 ? "grid-cols-2" : "grid-cols-1 max-w-md"}`}>
                {Array.from({ length: imageCount }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                    <div className="text-center text-slate-500">
                      <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs">Photo {i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-200" data-testid="epk-bio-empty">
          <p>Your biography is essential for a compelling EPK. A well-crafted bio helps A&R representatives, journalists, and industry professionals understand your artistic vision.</p>
          <Link href="/settings" className="mt-4 inline-flex rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors" data-testid="epk-bio-settings-link">
            Add Your Bio
          </Link>
        </div>
      )}
    </section>
  );
}
