"use client";

import {
  createContext,
  useCallback,
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
  signOut: () => Promise<void>;
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
  >(initialSession ? "authenticated" : "unauthenticated");

  const refreshSession = useCallback(async function refreshSession() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        // Suppress browser console warnings for expected 401/404 responses
        signal: AbortSignal.timeout(5000),
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
    } catch (error) {
      // Silently handle errors (user not logged in, network issues, etc.)
      // This is expected behavior - just mark as unauthenticated
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(async function signOut() {
    setSession(null);
    setStatus("unauthenticated");

    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      status,
      refreshSession,
      signOut,
    }),
    [refreshSession, session, signOut, status],
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
