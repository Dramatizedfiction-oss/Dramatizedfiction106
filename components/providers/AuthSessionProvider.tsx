"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AuthSession } from "@/auth";

type AuthSessionContextValue = {
  session: AuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refreshSession: () => Promise<void>;
  /** Ends the session on the server; resolves true when the server confirmed it. */
  signOut: () => Promise<boolean>;
  /**
   * Sign out and land on the home page with a full page load (which also
   * drops every cached signed-in page). Always finishes, even if the request
   * fails or hangs; repeated calls while it runs are ignored.
   */
  signOutAndGoHome: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

/** How long a sign-out request may take before we stop waiting for it. */
const SIGN_OUT_TIMEOUT_MS = 8000;
/** Set while a sign-out hasn't been confirmed by the server; retried on the next page load. */
const PENDING_SIGN_OUT_KEY = "df-signout-pending";

function setPendingSignOut(pending: boolean) {
  try {
    if (pending) window.localStorage.setItem(PENDING_SIGN_OUT_KEY, "1");
    else window.localStorage.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {
    // Storage blocked (private mode): the request itself is still made.
  }
}

function hasPendingSignOut() {
  try {
    return window.localStorage.getItem(PENDING_SIGN_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/** POST /api/auth/logout with a time limit; true when the server cleared the cookie. */
async function requestSignOut() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(SIGN_OUT_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

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

  // Bumped by every sign-out. A session check that started before a sign-out
  // must not undo it when it finishes (e.g. the page's first check is still
  // running on a slow connection when "Log out" is tapped).
  const signOutGeneration = useRef(0);

  const refreshSession = useCallback(async function refreshSession() {
    const generation = signOutGeneration.current;
    const stale = () => generation !== signOutGeneration.current;
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        // Suppress browser console warnings for expected 401/404 responses
        signal: AbortSignal.timeout(5000),
      });

      if (stale()) return;
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

      if (stale()) return;
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
      // Signed in again since an unconfirmed sign-out: don't finish that one later.
      setPendingSignOut(false);
    } catch (error) {
      // Silently handle errors (user not logged in, network issues, etc.)
      // This is expected behavior - just mark as unauthenticated
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(async function signOut() {
    signOutGeneration.current += 1;
    setSession(null);
    setStatus("unauthenticated");
    // If the server can't be reached, the (script-proof) session cookie can't
    // be cleared from here: remember to finish on the next page load.
    setPendingSignOut(true);
    const confirmed = await requestSignOut();
    if (confirmed) setPendingSignOut(false);
    return confirmed;
  }, []);

  const leaving = useRef(false);
  const signOutAndGoHome = useCallback(
    async function signOutAndGoHome() {
      if (leaving.current) return;
      leaving.current = true;
      await signOut();
      // A full load, not a client-side push: no cached signed-in page survives,
      // and every piece of in-memory UI state starts fresh.
      window.location.replace("/");
    },
    [signOut],
  );

  useEffect(() => {
    // A sign-out that didn't reach the server last time: finish it first.
    if (hasPendingSignOut()) {
      setSession(null);
      setStatus("unauthenticated");
      void requestSignOut().then((confirmed) => {
        if (!confirmed) return;
        setPendingSignOut(false);
        // This page was rendered with the old session: load the signed-out one.
        if (initialSession) window.location.reload();
      });
      return;
    }
    void refreshSession();
    // initialSession is only read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      status,
      refreshSession,
      signOut,
      signOutAndGoHome,
    }),
    [refreshSession, session, signOut, signOutAndGoHome, status],
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
