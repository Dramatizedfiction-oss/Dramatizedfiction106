"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthRestriction } from "@/auth";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { formatRestrictionEnd } from "@/lib/admin/format";

/*
 * What a restricted member sees: the kind of restriction and, for a
 * discipline action, when it ends. The private reason is never shown.
 * Sign out stays available.
 */
export default function RestrictedScreen({ restriction }: { restriction: AuthRestriction }) {
  const router = useRouter();
  const { signOut } = useAuthSession();
  const [signingOut, setSigningOut] = useState(false);
  const banned = restriction.kind === "BAN";

  return (
    <main className="app-canvas flex min-h-screen items-center justify-center px-5 py-16">
      <section className="theme-panel w-full max-w-lg rounded-[28px] border p-6 sm:p-8">
        <p className="eyebrow">Account status</p>
        <h1 className="font-heading theme-heading mt-3 text-3xl font-semibold">
          {banned ? "This account has been suspended" : "This account is temporarily restricted"}
        </h1>
        <p className="theme-body mt-4 text-sm leading-6">
          {banned
            ? "Dramatized Fiction's administration has suspended this account. You can't use the platform while the suspension is in place."
            : `Dramatized Fiction's administration has placed a one-month restriction on this account. Until ${formatRestrictionEnd(
                restriction.endsAt,
              )}, you can read stories but can't post, publish, edit your profile or use Writer Studio. Full access returns automatically when it ends.`}
        </p>
        <p className="theme-meta mt-4 text-xs leading-5">
          A support contact isn&apos;t available yet. If you believe this is a mistake, please reach out to Dramatized
          Fiction directly.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {banned ? null : (
            <button type="button" onClick={() => router.push("/")} className="story-button-secondary">
              Keep reading
            </button>
          )}
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await signOut();
              router.refresh();
              router.push("/");
            }}
            className="story-button-primary disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>
    </main>
  );
}
