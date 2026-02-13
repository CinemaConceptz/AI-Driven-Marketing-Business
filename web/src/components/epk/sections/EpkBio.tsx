import type { EpkProfile } from "@/components/epk/types";

const placeholder =
  "Bio not provided yet. Complete your profile in Settings when available.";

type Props = {
  profile: EpkProfile | null;
};

export default function EpkBio({ profile }: Props) {
  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-bio">
      <h2 className="text-xl font-semibold text-white" data-testid="epk-bio-title">
        Bio
      </h2>
      <p className="mt-4 text-sm text-slate-200" data-testid="epk-bio-content">
        {profile?.bio || placeholder}
      </p>
    </section>
  );
}
