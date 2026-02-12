export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="terms-kicker"
        >
          Terms of service
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white" data-testid="terms-title">
          Verified Sound Representation Terms
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="terms-intro">
          These terms govern access to the Verified Sound Representation Platform.
        </p>
      </section>

      <section className="glass-panel space-y-5 rounded-3xl px-8 py-10 text-sm text-slate-200">
        <div data-testid="terms-section-services">
          <h2 className="text-lg font-semibold text-white">Services</h2>
          <p className="mt-2">
            Verified Sound provides campaign-driven representation services,
            including outreach, positioning, and placement-focused strategy.
          </p>
        </div>
        <div data-testid="terms-section-eligibility">
          <h2 className="text-lg font-semibold text-white">Eligibility</h2>
          <p className="mt-2">
            You must provide accurate artist information and maintain ownership
            or rights to submitted materials.
          </p>
        </div>
        <div data-testid="terms-section-disclaimer">
          <h2 className="text-lg font-semibold text-white">No guarantee</h2>
          <p className="mt-2">
            Placement outcomes depend on partner interest and market conditions.
            Verified Sound does not guarantee placement or signing.
          </p>
        </div>
        <div data-testid="terms-section-cancel">
          <h2 className="text-lg font-semibold text-white">Cancellation</h2>
          <p className="mt-2">
            Subscription cancellations follow the billing provider terms.
            Contact info@verifiedsoundar.com for support.
          </p>
        </div>
        <div data-testid="terms-section-contact">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="mt-2">
            Verified Sound, 18300 S. Halsted Street suite B1-227, Glenwood IL
            60425 — info@verifiedsoundar.com
          </p>
        </div>
      </section>
    </div>
  );
}
