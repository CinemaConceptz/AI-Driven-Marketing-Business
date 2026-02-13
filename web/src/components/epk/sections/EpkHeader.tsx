import type { EpkProfile } from "@/components/epk/types";

const fallback = "Not provided";

type Props = {
  profile: EpkProfile | null;
  uid: string;
};

export default function EpkHeader({ profile, uid }: Props) {
  const name = profile?.artistName || profile?.displayName || "Artist Name";
  const location = profile?.location || "Location TBD";
  const website = profile?.website || "";
  const instagram = profile?.instagram || "";

  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-3xl font-semibold text-white"
            data-testid="epk-artist-name"
          >
            {name}
          </h1>
          <p className="mt-2 text-sm text-slate-200" data-testid="epk-location">
            {location}
          </p>
        </div>
        <div className="text-xs text-slate-400" data-testid="epk-uid">
          UID: {uid}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
        {website ? (
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white"
            data-testid="epk-website-link"
          >
            Website
          </a>
        ) : (
          <span className="text-xs text-slate-400" data-testid="epk-website-empty">
            Website: {fallback}
          </span>
        )}
        {instagram ? (
          <a
            href={instagram}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white"
            data-testid="epk-instagram-link"
          >
            Instagram
          </a>
        ) : (
          <span
            className="text-xs text-slate-400"
            data-testid="epk-instagram-empty"
          >
            Instagram: {fallback}
          </span>
        )}
      </div>
    </section>
  );
}
