// DEV ONLY - Unified auth hook that checks both real session and dev session
// This hook should be used throughout the app to determine authentication state
// Remove this file when the main auth system is stable.

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { isDevAuthenticated, isDevModeEnabled } from "@/lib/dev-auth";
import type { AppRole } from "@/lib/roles";

export interface UnifiedUser {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  role: AppRole;
  isDevMode?: boolean;
}

export interface UnifiedAuthState {
  isAuthenticated: boolean;
  isDevMode: boolean;
  user: UnifiedUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

/**
 * useUnifiedAuth - Combines NextAuth session and localStorage dev session
 * Returns a unified auth state that includes both real and dev authentication
 * Handles hydration safety by tracking mount state
 */
export function useUnifiedAuth(): UnifiedAuthState {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [devAuthState, setDevAuthState] = useState<UnifiedAuthState>({
    isAuthenticated: false,
    isDevMode: false,
    user: null,
    status: "loading",
  });

  // Check dev auth state on mount and when session changes
  useEffect(() => {
    setMounted(true);

    // Check if dev mode is enabled and active
    const devModeEnabled = isDevModeEnabled();
    const devAuthenticated = devModeEnabled && isDevAuthenticated();

    if (session?.user) {
      // Real auth session exists
      setDevAuthState({
        isAuthenticated: true,
        isDevMode: false,
        user: {
          id: session.user.id || "",
          name: session.user.name || null,
          email: session.user.email,
          image: session.user.image,
          role: (session.user.role || "READER") as AppRole,
          isDevMode: false,
        },
        status: "authenticated",
      });
    } else if (devAuthenticated) {
      // Dev CEO session exists
      setDevAuthState({
        isAuthenticated: true,
        isDevMode: true,
        user: {
          id: "dev-ceo",
          name: localStorage.getItem("devName") || "Developer CEO",
          email: "dev@local.test",
          image: null,
          role: "CEO",
          isDevMode: true,
        },
        status: "authenticated",
      });
    } else {
      // No authentication
      setDevAuthState({
        isAuthenticated: false,
        isDevMode: false,
        user: null,
        status: status === "loading" ? "loading" : "unauthenticated",
      });
    }
  }, [session, status]);

  // During SSR, return loading state
  if (!mounted) {
    return {
      isAuthenticated: false,
      isDevMode: false,
      user: null,
      status: "loading",
    };
  }

  return devAuthState;
}

/**
 * Helper to get the display name for the current user
 */
export function useCurrentUserName(): string {
  const { user } = useUnifiedAuth();
  return user?.name || "Member";
}

/**
 * Helper to check if user has a specific role
 */
export function useHasRole(requiredRole: AppRole): boolean {
  const { user } = useUnifiedAuth();
  if (!user) return false;

  const { hasRoleAccess } = require("@/lib/roles");
  return hasRoleAccess(user.role, requiredRole);
}
