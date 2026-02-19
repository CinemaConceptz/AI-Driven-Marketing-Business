import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12 text-sm text-slate-300 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-base font-semibold text-white" data-testid="footer-brand">
            Verified Sound
          </p>
          <p data-testid="footer-address">
            18300 S. Halsted Street suite B1-227, Glenwood IL 60425
          </p>
          <p data-testid="footer-email">info@verifiedsoundar.com</p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Platform
            </p>
            <Link href="/pricing" data-testid="footer-pricing-link">
              A&amp;R–Representation
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Legal
            </p>
            <Link href="/privacy" data-testid="footer-privacy-link">
              Privacy
            </Link>
            <Link href="/terms" data-testid="footer-terms-link">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
