"use client";

import React from "react";
import AdminNav from "./AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" data-testid="admin-shell">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
          </div>
          <AdminNav />
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
