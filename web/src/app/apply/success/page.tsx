export default function ApplySuccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="glass-panel rounded-3xl px-8 py-10" data-testid="apply-success-page">
        <h1 className="text-2xl font-semibold text-white">Payment confirmed</h1>
        <p className="mt-3 text-sm text-slate-200">
          Your submission payment is confirmed. You can now complete the intake form.
        </p>
        <a
          href="/apply"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#021024]"
          data-testid="apply-success-cta"
        >
          Go to intake
        </a>
      </div>
    </div>
  );
}
