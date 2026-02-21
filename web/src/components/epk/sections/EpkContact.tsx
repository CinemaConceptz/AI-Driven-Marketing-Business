import type { EpkProfile, SubscriptionTier } from "@/components/epk/types";

type Props = {
  profile: EpkProfile | null;
  tier: SubscriptionTier;
  showFull?: boolean;
};

export default function EpkContact({ profile, tier, showFull = false }: Props) {
  const isPremium = tier === "tier3";
  const isPro = tier === "tier2" || tier === "tier3";
  const sectionTitle = isPremium ? "Industry Contact & Representation" : isPro ? "Contact Information" : "Contact";

  return (
    <section 
      className={`rounded-3xl px-8 py-10 ${isPremium ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20" : "glass-panel"}`}
      data-testid="epk-contact"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`font-semibold text-white ${isPremium ? "text-2xl" : "text-xl"}`} data-testid="epk-contact-title">
          {sectionTitle}
        </h2>
        {isPremium && (
          <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">For Booking & Press Inquiries</span>
        )}
      </div>

      <div className={`grid gap-6 ${isPremium ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="space-y-4">
          <h3 className={`text-xs uppercase tracking-wider ${isPremium ? "text-amber-400" : "text-emerald-400"}`}>General Inquiries</h3>
          <div data-testid="epk-contact-email">
            <p className="text-xs text-slate-500">Email</p>
            <p className="mt-1 text-sm text-white font-medium">{profile?.email || <span className="text-slate-500 italic">Not provided</span>}</p>
          </div>
          <div data-testid="epk-contact-phone">
            <p className="text-xs text-slate-500">Phone</p>
            <p className="mt-1 text-sm text-white">{profile?.phone || <span className="text-slate-500 italic">Not provided</span>}</p>
          </div>
          {profile?.website && (
            <div data-testid="epk-contact-website">
              <p className="text-xs text-slate-500">Website</p>
              <a href={profile.website} target="_blank" rel="noreferrer" className="mt-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>

        {isPro && (
          <div className="space-y-4">
            <h3 className={`text-xs uppercase tracking-wider ${isPremium ? "text-amber-400" : "text-emerald-400"}`}>Social Media</h3>
            {profile?.instagram && (
              <div>
                <p className="text-xs text-slate-500">Instagram</p>
                <a href={profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram.replace("@", "")}`}
                  target="_blank" rel="noreferrer" className="mt-1 text-sm text-white hover:text-emerald-400 transition-colors">
                  @{profile.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}
                </a>
              </div>
            )}
            {profile?.links?.youtube && (
              <div>
                <p className="text-xs text-slate-500">YouTube</p>
                <a href={profile.links.youtube} target="_blank" rel="noreferrer" className="mt-1 text-sm text-white hover:text-emerald-400 transition-colors">View Channel</a>
              </div>
            )}
            {profile?.links?.tiktok && (
              <div>
                <p className="text-xs text-slate-500">TikTok</p>
                <a href={profile.links.tiktok} target="_blank" rel="noreferrer" className="mt-1 text-sm text-white hover:text-emerald-400 transition-colors">View Profile</a>
              </div>
            )}
          </div>
        )}

        {isPremium && showFull && (
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-amber-400">Representation</h3>
            {profile?.management && <div><p className="text-xs text-slate-500">Management</p><p className="mt-1 text-sm text-white">{profile.management}</p></div>}
            {profile?.bookingAgent && <div><p className="text-xs text-slate-500">Booking Agent</p><p className="mt-1 text-sm text-white">{profile.bookingAgent}</p></div>}
            {profile?.publicist && <div><p className="text-xs text-slate-500">Publicist / Press</p><p className="mt-1 text-sm text-white">{profile.publicist}</p></div>}
            {profile?.recordLabel && <div><p className="text-xs text-slate-500">Label</p><p className="mt-1 text-sm text-white font-medium">{profile.recordLabel}</p></div>}
            {!profile?.management && !profile?.bookingAgent && !profile?.publicist && !profile?.recordLabel && (
              <p className="text-sm text-slate-500 italic">Representation details not provided</p>
            )}
          </div>
        )}
      </div>

      {isPro && profile?.email && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <a href={`mailto:${profile.email}?subject=Press Inquiry - ${profile.artistName || "Artist"}`}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${isPremium ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact for Bookings & Press
          </a>
        </div>
      )}
    </section>
  );
}
