import Link from "next/link";
import type { EpkProfile } from "@/components/epk/types";

type Props = {
  profile: EpkProfile | null;
};

export default function EpkBio({ profile }: Props) {
  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-bio">
      <h2 className="text-xl font-semibold text-white" data-testid="epk-bio-title">
        Bio
      </h2>
      {profile?.bio ? (
        <p className="mt-4 text-sm text-slate-200" data-testid="epk-bio-content">
          {profile.bio}
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-200" data-testid="epk-bio-empty">
          Bio not set. Add one in{" "}
          <Link
            href="/apply"
            className="underline"
            data-testid="epk-bio-settings-link"
          >
            Apply
          </Link>
          .
        </p>
      )}
    </section>
  );
}
