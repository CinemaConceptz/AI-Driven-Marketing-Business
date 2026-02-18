"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

const links = [
  { href: "/", label: "Home", testId: "nav-home-link" },
  { href: "/pricing", label: "Pricing", testId: "nav-pricing-link" },
  { href: "/apply", label: "Apply", testId: "nav-apply-link" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="border-b border-white/10 bg-[#050913]/80 px-6 py-4 backdrop-blur sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold text-white"
          data-testid="nav-logo"
        >
          Verified Sound A&R
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-200">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={link.testId}
              className={`transition hover:text-white ${
                pathname === link.href ? "text-white" : "text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/dashboard"
                data-testid="nav-dashboard-link"
                className={`transition hover:text-white ${
                  pathname === "/dashboard" ? "text-white" : "text-slate-200"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/media"
                data-testid="nav-media-link"
                className={`transition hover:text-white ${
                  pathname === "/media" ? "text-white" : "text-slate-200"
                }`}
              >
                Media
              </Link>
              <Link
                href="/epk"
                data-testid="nav-epk-link"
                className={`transition hover:text-white ${
                  pathname === "/epk" ? "text-white" : "text-slate-200"
                }`}
              >
                EPK
              </Link>
              <Link
                href="/settings"
                data-testid="nav-settings-link"
                className={`transition hover:text-white ${
                  pathname === "/settings" ? "text-white" : "text-slate-200"
                }`}
              >
                Settings
              </Link>



              <button
                onClick={handleSignOut}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/60"
                data-testid="nav-signout-button"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              data-testid="nav-login-link"
              className={`transition hover:text-white ${
                pathname === "/login" ? "text-white" : "text-slate-200"
              }`}
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
