import type { EpkProfile } from "@/components/epk/types";

const fallback = "Not provided";

type Props = {
  profile: EpkProfile | null;
};

export default function EpkContact({ profile }: Props) {
  return (
    <section className="glass-panel rounded-3xl px-8 py-10" data-testid="epk-contact">
      <h2
        className="text-xl font-semibold text-white"
        data-testid="epk-contact-title"
      >
        Contact
      </h2>
      <div className="mt-4 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
        <div data-testid="epk-contact-email">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
          <p className="mt-1">{profile?.email || fallback}</p>
        </div>
        <div data-testid="epk-contact-phone">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</p>
          <p className="mt-1">{profile?.phone || fallback}</p>
        </div>
        <div data-testid="epk-contact-website">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Website</p>
          <p className="mt-1">{profile?.website || fallback}</p>
        </div>
        <div data-testid="epk-contact-instagram">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Instagram</p>
          <p className="mt-1">{profile?.instagram || fallback}</p>
        </div>
      </div>
    </section>
  );
}
