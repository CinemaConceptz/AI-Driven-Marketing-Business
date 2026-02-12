export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-10">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="privacy-kicker"
        >
          Privacy policy
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white" data-testid="privacy-title">
          Verified Sound Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-slate-200" data-testid="privacy-intro">
          We respect your privacy and only collect information needed to deliver
          representation services.
        </p>
      </section>

      <section className="glass-panel space-y-5 rounded-3xl px-8 py-10 text-sm text-slate-200">
        <div data-testid="privacy-section-collection">
          <h2 className="text-lg font-semibold text-white">Information collected</h2>
          <p className="mt-2">
            We collect artist intake details, contact information, and campaign
            preferences to evaluate representation fit and manage outreach.
          </p>
        </div>
        <div data-testid="privacy-section-use">
          <h2 className="text-lg font-semibold text-white">How we use data</h2>
          <p className="mt-2">
            Data is used to deliver representation services, manage outreach
            campaigns, and communicate next steps. We do not sell personal data.
          </p>
        </div>
        <div data-testid="privacy-section-security">
          <h2 className="text-lg font-semibold text-white">Security</h2>
          <p className="mt-2">
            We maintain secure systems and limit access to authorized team
            members. Access is restricted to representation workflow needs.
          </p>
        </div>
        <div data-testid="privacy-section-contact">
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
