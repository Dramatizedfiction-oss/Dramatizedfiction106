import type { AppRole } from "@/lib/roles";

export const PROTECTED_ROUTE_RULES: Array<{
  prefix: string;
  minimumRole?: AppRole;
}> = [
  { prefix: "/writer", minimumRole: "WRITER" },
  { prefix: "/writer-studio", minimumRole: "WRITER" },
  { prefix: "/command-center", minimumRole: "BOARD" },
  { prefix: "/ceo", minimumRole: "CEO" },
  { prefix: "/ceo-studio", minimumRole: "CEO" },
];

export const AUTH_PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
];
