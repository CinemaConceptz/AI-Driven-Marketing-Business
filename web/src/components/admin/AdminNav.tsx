"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2" data-testid="admin-nav">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              "rounded-xl px-3 py-2 text-sm border transition-colors",
              active
                ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white"
                : "border-neutral-800 bg-neutral-900/40 text-neutral-200 hover:border-neutral-600"
            )}
            data-testid={`admin-nav-${l.label.toLowerCase()}`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
