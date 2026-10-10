import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DeleteAccountForm from "@/components/settings/DeleteAccountForm";
import { SettingsSection } from "@/components/settings/SettingsUi";
import { deletionSummary } from "@/lib/account-service";
import { requireRole } from "@/lib/utils";

/*
 * Delete account: a full page (so it's a full screen on phones) that spells
 * out what will be removed before asking for the password and DELETE. The
 * deletion itself is immediate (DELETE /api/me/account).
 */
export default async function DeleteAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings/account/delete");
  requireRole(session, ["READER"]);

  const summary = await deletionSummary(session.user.id);
  const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/settings/account"
          className="theme-meta -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 4.5L7 10l5.5 5.5" />
          </svg>
          Account
        </Link>
        <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">Delete your account</h1>

        {summary.isLastCeo ? (
          <SettingsSection tone="danger" title="This account can't be deleted">
            <p className="theme-body text-sm leading-6">
              You&apos;re the only CEO of Dramatized Fiction, so this account can&apos;t be deleted. Make another member CEO in
              Administration › Members first.
            </p>
          </SettingsSection>
        ) : (
          <>
            <SettingsSection tone="danger" title="This is permanent and immediate">
              <p className="theme-body text-sm leading-6">Deleting your account removes, right away and for good:</p>
              <ul className="theme-body mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6">
                <li>Your sign-ins on every device. You&apos;ll be signed out everywhere.</li>
                <li>Your follows: {summary.follows.toLocaleString()} series in your Library.</li>
                <li>Your profile: display name, picture, background picture, bio and links.</li>
                {summary.series > 0 || summary.episodes > 0 ? (
                  <li className="font-semibold text-[var(--status-danger)]">
                    Your stories: {summary.series.toLocaleString()} series and {plural(summary.episodes, "episode")}, including published
                    ones.
                  </li>
                ) : null}
              </ul>
              {summary.series > 0 ? (
                <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--status-danger)_45%,transparent)] p-4 text-sm leading-6 text-[var(--text-primary)]">
                  Readers will lose these stories immediately
                  {summary.followersLosing > 0 ? `, and ${plural(summary.followersLosing, "follow")} of your series by other readers will be removed` : ""}.
                  This can&apos;t be undone.
                </p>
              ) : null}
            </SettingsSection>

            <SettingsSection title="Confirm">
              <DeleteAccountForm />
            </SettingsSection>
          </>
        )}
      </div>
    </main>
  );
}
