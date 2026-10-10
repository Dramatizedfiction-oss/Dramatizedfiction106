import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AgeConfirmation, ChangePasswordForm, DisplayNameForm } from "@/components/settings/AccountForms";
import { SettingsPageHeader, SettingsSection } from "@/components/settings/SettingsUi";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/utils";

/*
 * Settings > Account. Top to bottom: Email (read-only), Display name, 18+
 * confirmation, Change password, then the danger area. New rows go above the
 * danger area, which always stays last.
 */
export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings/account");
  requireRole(session, ["READER"]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, ageConfirmedAt: true },
  });
  if (!user) redirect("/sign-in?callbackUrl=/settings/account");

  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <SettingsPageHeader title="Account" description="Your sign-in details and account." />

        <SettingsSection title="Email" description="Changing your email isn't available yet.">
          <p className="theme-heading min-h-11 break-all rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-medium">
            {user.email ?? "Not set"}
          </p>
        </SettingsSection>

        <SettingsSection title="Display name">
          <DisplayNameForm initial={user.name ?? ""} />
        </SettingsSection>

        <SettingsSection
          title="18+ confirmation"
          description="Optional. Confirming you're 18 or over will be needed for mature content and for purchases or payouts later. Nothing depends on it yet."
        >
          <AgeConfirmation confirmedAt={user.ageConfirmedAt ? user.ageConfirmedAt.toISOString() : null} />
        </SettingsSection>

        <SettingsSection title="Change password" description="After changing it, you'll stay signed in here and be signed out everywhere else.">
          <ChangePasswordForm />
        </SettingsSection>

        {/* Future account rows go above this line; the danger area stays last. */}
        <div className="mt-10 border-t border-[var(--border-color)] pt-2">
          <SettingsSection
            tone="danger"
            title="Delete account"
            description="Permanently deletes your account. If you're a writer, your series and episodes are deleted too. This can't be undone."
          >
            <Link
              href="/settings/account/delete"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--status-danger)] px-5 text-sm font-semibold text-[var(--status-danger)] transition hover:bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-danger)]"
            >
              Delete account…
            </Link>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
