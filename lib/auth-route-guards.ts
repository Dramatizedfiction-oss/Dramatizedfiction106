import type { AppRole } from "@/lib/roles";

// Prefixes that need a session cookie (checked in middleware.ts). The real
// role checks are server-side in each page and route handler.
export const PROTECTED_ROUTE_RULES: Array<{
  prefix: string;
  minimumRole?: AppRole;
}> = [
  { prefix: "/writer", minimumRole: "WRITER" },
  { prefix: "/writer-studio", minimumRole: "WRITER" },
  { prefix: "/administration", minimumRole: "BOARD" },
  { prefix: "/ceo-studio", minimumRole: "CEO" },
  { prefix: "/command-center", minimumRole: "BOARD" },
  { prefix: "/ceo", minimumRole: "CEO" },
];

/** Set by middleware.ts on every request (incoming values are overwritten); read by the root layout. */
export const PATHNAME_HEADER = "x-df-pathname";

export const AUTH_PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
];
