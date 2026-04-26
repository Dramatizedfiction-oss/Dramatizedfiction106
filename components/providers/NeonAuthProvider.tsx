"use client";

import type { ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import "@neondatabase/neon-js/ui/css";
import { authClient } from "@/lib/neon-auth";

export default function NeonAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NeonAuthUIProvider authClient={authClient} redirectTo="/explore">
      {children}
    </NeonAuthUIProvider>
  );
}
