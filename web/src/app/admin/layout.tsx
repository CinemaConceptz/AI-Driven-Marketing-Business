"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdminUid } from "@/lib/admin/adminGuard";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login?next=/admin");
        return;
      }
      const ok = await isAdminUid(user.uid);
      setAllowed(ok);
      if (!ok) {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [router]);

  if (allowed === null) {
    return (
      <div className="mx-auto max-w-7xl py-10" data-testid="admin-loading">
        <div className="text-sm text-neutral-400">Checking admin access...</div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
