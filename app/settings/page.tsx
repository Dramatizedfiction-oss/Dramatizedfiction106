import Link from "next/link";
import { auth } from "@/auth";
import { BookOpenIcon, UserIcon } from "@/components/icons";
import { SettingsCard } from "@/components/settings/SettingsUi";

/*
 * Settings: how the app behaves for this member. A short list of arrow cards,
 * each leading to its own page, and only for sections that really work. How
 * others see you (picture, visibility, bio) lives in the profile editor;
 * anything about money will live in Writer Studio > Grow.
 */
export default async function SettingsPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Settings</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">Settings</h1>

        <ul className="mt-8 space-y-3">
          {signedIn ? (
            <SettingsCard
              href="/settings/account"
              title="Account"
              description="Email, display name, 18+ confirmation, password and account deletion."
              icon={<UserIcon size={18} />}
            />
          ) : null}
          <SettingsCard
            href="/settings/reading"
            title="Reading & Appearance"
            description="Theme, text size, line spacing, reading width and motion on this device."
            icon={<BookOpenIcon size={18} />}
          />
          {signedIn ? (
            <SettingsCard href="/settings/about" title="About & Help" description="About Dramatized Fiction and how AI labels work." icon={<InfoIcon />} />
          ) : null}
        </ul>

        {!signedIn ? (
          <section className="theme-panel mt-6 rounded-[24px] border p-5 sm:p-6">
            <h2 className="theme-heading text-lg font-semibold">Your account</h2>
            <p className="theme-meta mt-1 text-sm">Sign in to manage your account.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/sign-in?callbackUrl=/settings" className="story-button-primary min-h-11">
                Sign in
              </Link>
              <Link href="/sign-up" className="story-button-secondary min-h-11">
                Create account
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6.2v.1" />
    </svg>
  );
}
