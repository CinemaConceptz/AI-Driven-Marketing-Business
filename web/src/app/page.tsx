import Link from "next/link";

const focusGenres = [
  "House",
  "EDM",
  "Disco",
  "Afro",
  "Soulful",
  "Trance",
];

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="glass-panel mx-auto flex w-full max-w-6xl flex-col gap-12 rounded-3xl px-8 py-14 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col items-center text-center gap-6 lg:items-start lg:text-left">
          <div
            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
            data-testid="hero-badge"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Representation Platform for label-ready artists
          </div>
          <h1
            className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
            data-testid="hero-title"
          >
            <span className="block">Verified Sound A&R</span>
            <span className="block">Representation</span>
            <span className="block">Platform</span>
          </h1>
          <p
            className="text-lg text-slate-200"
            data-testid="hero-subtitle"
          >
            Executive-facing, campaign-driven representation that positions
            House, EDM, Disco, Afro, Soulful, and Trance artists for
            placement-focused outcomes.
          </p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3" data-testid="focus-genres">
            {focusGenres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100"
              >
                {genre}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
            <Link
              href="/pricing"
              data-testid="hero-primary-cta"
              className="rounded-full bg-[#6ee7ff] px-6 py-3 text-sm font-semibold text-[#021024] transition hover:brightness-110"
            >
              View Pricing
            </Link>
            <Link
              href="/apply"
              data-testid="hero-secondary-cta"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Apply for Representation
            </Link>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Verified Sound A&R"
              width={180}
              height={180}
              style={{ width: "180px", height: "auto" }}
              data-testid="hero-logo"
            />
          </div>
          <div
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left text-sm text-slate-200"
            data-testid="hero-proof"
          >
            Industry-grade representation built for placement-focused campaigns.
            Label-ready positioning, executive-facing materials, and disciplined
            outreach.
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-3">
        {[
          {
            title: "A&R-driven outreach engine",
            description:
              "Curated targeting, personalized positioning, and campaign-led follow-through.",
          },
          {
            title: "Executive-facing presentation",
            description:
              "Label-ready collateral, clean narrative, and premium creative framing.",
          },
          {
            title: "Placement-focused execution",
            description:
              "Structured timelines, measurable outreach cycles, and disciplined reporting.",
          },
        ].map((item, index) => (
          <div
            key={item.title}
            className="glass-panel rounded-2xl px-6 py-8"
            data-testid={`feature-card-${index + 1}`}
          >
            <h3 className="text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm text-slate-200">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-3">
          <p
            className="text-sm uppercase tracking-[0.2em] text-slate-400"
            data-testid="process-kicker"
          >
            Campaign-driven workflow
          </p>
          <h2
            className="text-3xl font-semibold text-white"
            data-testid="process-title"
          >
            Representation that moves with intent
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              step: "01",
              title: "Positioning audit",
              copy: "We assess your catalog, creative narrative, and campaign readiness.",
            },
            {
              step: "02",
              title: "Targeted outreach",
              copy: "A&R-led targeting to align releases with the right channels.",
            },
            {
              step: "03",
              title: "Placement tracking",
              copy: "Clear next steps, reporting, and campaign evolution.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="glass-panel rounded-2xl px-6 py-7"
              data-testid={`process-step-${item.step}`}
            >
              <p className="text-sm text-slate-400">{item.step}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-slate-200">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl">
        <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-3xl px-8 py-12 lg:flex-row lg:items-center">
          <div>
            <h2
              className="text-3xl font-semibold text-white"
              data-testid="cta-title"
            >
              Ready for executive-facing representation?
            </h2>
            <p className="mt-3 text-sm text-slate-200" data-testid="cta-copy">
              Start with pricing or submit your intake to begin evaluation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#021024]"
              data-testid="cta-pricing-button"
            >
              Review tiers
            </Link>
            <Link
              href="/apply"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              data-testid="cta-apply-button"
            >
              Submit intake
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
