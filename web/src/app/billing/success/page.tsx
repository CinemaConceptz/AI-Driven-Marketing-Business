import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-12 text-center">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="billing-success-kicker"
        >
          Payment confirmed
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-white"
          data-testid="billing-success-title"
        >
          Your subscription is active
        </h1>
        <p className="mt-4 text-sm text-slate-200" data-testid="billing-success-copy">
          We will activate your representation workflow and provide next steps
          inside your dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-[#6ee7ff] px-6 py-3 text-sm font-semibold text-[#021024]"
            data-testid="billing-success-dashboard-button"
          >
            Go to dashboard
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
            data-testid="billing-success-pricing-button"
          >
            View pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
