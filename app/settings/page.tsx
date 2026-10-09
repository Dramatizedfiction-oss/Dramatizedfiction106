import Link from "next/link";
import { auth } from "@/auth";
import ProfileSettings from "@/components/settings/ProfileSettings";
import ThemePreferenceControl from "@/components/settings/ThemePreferenceControl";
import UserAvatar from "@/components/UserAvatar";
import { defaultAvatarFor } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import { getRoleLabel, hasRoleAccess, normalizeRole } from "@/lib/roles";
import { writerStatusLabel } from "@/lib/writer-studio/status";

/*
 * Settings: Profile and Account for signed-in users, Appearance for everyone.
 * Only settings that work today are shown. Role and writer status are
 * displayed read-only; nothing here can change them.
 */
export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bannerImage: true,
          bio: true,
          role: true,
          writerStatus: true,
          websiteUrl: true,
          twitterUrl: true,
          instagramUrl: true,
          youtubeUrl: true,
          discordUrl: true,
        },
      })
    : null;
  const isWriter = hasRoleAccess(user?.role, "WRITER");

  return (
    <main className="md:p-10">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Settings</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">Settings</h1>

        {user ? (
          <Section title="Profile" description={isWriter ? "How you appear to readers." : "How you appear on Dramatized Fiction."}>
            <ProfileSettings
              isWriter={isWriter}
              defaultAvatar={defaultAvatarFor(user.role)}
              initial={{
                userId: user.id,
                name: user.name ?? "",
                bio: user.bio ?? "",
                image: user.image ?? "",
                bannerImage: user.bannerImage ?? "",
                websiteUrl: user.websiteUrl ?? "",
                twitterUrl: user.twitterUrl ?? "",
                instagramUrl: user.instagramUrl ?? "",
                youtubeUrl: user.youtubeUrl ?? "",
                discordUrl: user.discordUrl ?? "",
              }}
            />
          </Section>
        ) : (
          <Section title="Your account" description="Sign in to change your profile picture and name.">
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-in?callbackUrl=/settings" className="story-button-primary">
                Sign in
              </Link>
              <Link href="/sign-up" className="story-button-secondary">
                Create account
              </Link>
            </div>
          </Section>
        )}

        <Section title="Appearance" description="Choose how Dramatized Fiction looks on this device.">
          <ThemePreferenceControl />
        </Section>

        {user ? (
          <Section title="Account" description="Your sign-in details and access.">
            <dl className="divide-y divide-[var(--border-color)]">
              <Row label="Email" value={user.email ?? "Not set"} />
              <Row
                label="Account type"
                value={
                  <span className="flex items-center justify-end gap-2">
                    <UserAvatar user={user} size="xs" />
                    {getRoleLabel(normalizeRole(user.role))}
                  </span>
                }
              />
              {isWriter ? <Row label="Writer status" value={writerStatusLabel(user.writerStatus)} /> : null}
            </dl>
            <p className="theme-meta mt-4 text-xs leading-5">
              Account type and writer status are managed by Dramatized Fiction.
              {isWriter ? null : (
                <>
                  {" "}
                  Want to publish?{" "}
                  <Link href="/become-author" className="text-[var(--accent)] underline-offset-4 hover:underline">
                    Become a writer
                  </Link>
                  .
                </>
              )}
            </p>
          </Section>
        ) : null}
      </div>
    </main>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="theme-panel mt-8 rounded-[28px] border p-5 sm:p-6">
      <h2 className="theme-heading text-xl font-semibold">{title}</h2>
      <p className="theme-meta mt-1 text-sm">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
      <dt className="theme-meta">{label}</dt>
      <dd className="theme-heading min-w-0 break-all text-right font-medium">{value}</dd>
    </div>
  );
}
