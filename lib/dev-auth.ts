// DEV ONLY - Development CEO Override System
// This file contains temporary development-only authentication logic
// that bypasses the database and works entirely locally.
// Remove this file and all references when the main auth system is stable.

import { normalizeRole, type AppRole } from "@/lib/roles";

// Check if development CEO login is enabled
export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") {
    // Server-side check
    return (
      process.env.NODE_ENV === "development" ||
      process.env.ENABLE_DEV_CEO_LOGIN === "true"
    );
  } else {
    // Client-side check (limited, but for UI purposes)
    return (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_ENABLE_DEV_CEO_LOGIN === "true"
    );
  }
}

// Get the development CEO password from environment
export function getDevPassword(): string | null {
  if (typeof window === "undefined") {
    return process.env.DEV_CEO_PASSWORD || null;
  } else {
    // For client-side, use NEXT_PUBLIC_ if set
    return process.env.NEXT_PUBLIC_DEV_CEO_PASSWORD || null;
  }
}

// Check if the provided password matches the dev password
export function verifyDevPassword(password: string): boolean {
  const devPassword = getDevPassword();
  return devPassword !== null && password === devPassword;
}

// Set development session in localStorage and cookies
export function setDevSession(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("devAuthenticated", "true");
    localStorage.setItem("devRole", "CEO");
    document.cookie = "devAuthenticated=true; path=/; max-age=3600; secure; samesite=strict";
    document.cookie = "devRole=CEO; path=/; max-age=3600; secure; samesite=strict";
  }
}

// Clear development session from localStorage and cookies
export function clearDevSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("devAuthenticated");
    localStorage.removeItem("devRole");
    document.cookie = "devAuthenticated=; path=/; max-age=0; secure; samesite=strict";
    document.cookie = "devRole=; path=/; max-age=0; secure; samesite=strict";
  }
}

// Check if development session is active
export function isDevAuthenticated(): boolean {
  if (typeof window === "undefined") {
    // Server-side
    try {
      const { cookies } = require("next/headers");
      const cookieStore = cookies();
      return cookieStore.get("devAuthenticated")?.value === "true";
    } catch {
      return false;
    }
  } else {
    return localStorage.getItem("devAuthenticated") === "true";
  }
}

// Get the development role (CEO)
export function getDevRole(): AppRole | null {
  if (isDevAuthenticated()) {
    return "CEO";
  }
  return null;
}

// Combined auth check: returns role if authenticated (dev or real)
export function getEffectiveRole(sessionRole: string | null | undefined): AppRole {
  const devRole = getDevRole();
  if (devRole) {
    return devRole;
  }
  // Fallback to session role
  return sessionRole ? normalizeRole(sessionRole) : "READER";
}