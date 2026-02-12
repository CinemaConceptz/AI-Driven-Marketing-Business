import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <section className="glass-panel rounded-3xl px-8 py-12 text-center">
        <p
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
          data-testid="billing-cancel-kicker"
        >
          Checkout canceled
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-white"
          data-testid="billing-cancel-title"
        >
          Subscription not activated
        </h1>
        <p className="mt-4 text-sm text-slate-200" data-testid="billing-cancel-copy">
          You can restart checkout at any time once you are ready.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-[#6ee7ff] px-6 py-3 text-sm font-semibold text-[#021024]"
            data-testid="billing-cancel-pricing-button"
          >
            Return to pricing
          </Link>
          <Link
            href="/apply"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
            data-testid="billing-cancel-apply-button"
          >
            Submit intake
          </Link>
        </div>
      </section>
    </div>
  );
}
