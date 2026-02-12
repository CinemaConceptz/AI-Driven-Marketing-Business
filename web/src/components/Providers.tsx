"use client";

import { PropsWithChildren } from "react";
import { AuthProvider } from "@/providers/AuthProvider";

export default function Providers({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
