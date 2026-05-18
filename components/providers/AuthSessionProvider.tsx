"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthSession } from "@/auth";

type AuthSessionContextValue = {
  session: AuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export default function AuthSessionProvider({
  children,
  session: initialSession,
}: {
  children: React.ReactNode;
  session: AuthSession | null;
}) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >(initialSession ? "authenticated" : "loading");

  async function refreshSession() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      const payload = (await response.json()) as {
        authenticated: boolean;
        user: AuthSession["user"] | null;
        expires?: string | null;
      };

      if (!payload.authenticated || !payload.user) {
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      setSession({
        user: payload.user,
        expires: payload.expires ?? new Date().toISOString(),
      });
      setStatus("authenticated");
    } catch {
      setSession(initialSession ?? null);
      setStatus(initialSession ? "authenticated" : "unauthenticated");
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo(
    () => ({
      session,
      status,
      refreshSession,
    }),
    [session, status],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}
