import "./globals.css";
import { headers } from "next/headers";
import { auth } from "@/auth";
import AppShell from "@/components/app-shell/AppShell";
import RenovationScreen from "@/components/platform/RenovationScreen";
import RestrictedScreen from "@/components/platform/RestrictedScreen";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { canBypassRenovation, isRenovationOpenPath } from "@/lib/admin/policy";
import { PATHNAME_HEADER } from "@/lib/auth-route-guards";
import { READING_INIT_SCRIPT } from "@/lib/reading-prefs";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getContent } from "@/lib/content/read";
import { getLayoutRenovationMode, getLayoutTrending } from "@/lib/layout-data";
import { isNextSignal } from "@/lib/next-signals";
import { getAccessibleStudiosForUser } from "@/lib/studios";
import type { Metadata, Viewport } from "next";

/** Absolute base for link-preview images (app/opengraph-image.png etc.). */
function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Icons, the home-screen manifest and the link-preview image come from the
// file conventions in app/ (icon.png, favicon.ico, apple-icon.png,
// manifest.ts, opengraph-image.png, twitter-image.png): scripts/make-brand-assets.ts.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dramatized Fiction", template: "%s · Dramatized Fiction" },
  description: "Serialized stories, one episode at a time.",
  applicationName: "Dramatized Fiction",
  openGraph: { siteName: "Dramatized Fiction", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0a10" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f7" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch((error) => {
    if (isNextSignal(error)) throw error;
    console.error("Root layout auth lookup failed. Rendering as guest.", error);
    return null;
  });
  const user = session?.user || null;
  const pathname = headers().get(PATHNAME_HEADER) ?? "";

  const renovationMode = await getLayoutRenovationMode()
    .catch((error) => {
      if (isNextSignal(error)) throw error;
      console.error("Platform settings lookup failed in layout.", error);
      return false;
    });

  // Server-side gates for every page. The page content is never rendered
  // (or sent) when one applies; API routes enforce the same rules in
  // lib/auth/guards.ts.
  //  - Renovation Mode: only CEO and Board see the site; others see the
  //    renovation page everywhere except sign-in.
  //  - Ban: the member sees only the restriction notice (and can sign out).
  //  - Discipline: browsing continues; actions, Writer Studio and admin
  //    areas are refused by the guards.
  const renovationBlocked = renovationMode && !canBypassRenovation(user?.role) && !isRenovationOpenPath(pathname);
  const banned = user?.restriction?.kind === "BAN";

  let content: React.ReactNode;
  if (renovationBlocked) {
    content = <RenovationScreen signedIn={Boolean(user)} />;
  } else if (banned) {
    content = <RestrictedScreen restriction={user!.restriction!} />;
  } else {
    let studios: any[] = [];
    let trending: any[] = [];
    // Administration › Content (cached; falls back to the built-in text, never throws).
    const [footer, announcement] = await Promise.all([getContent("copy.footer"), getContent("site.announcement")]);

    try {
      [studios, trending] = await Promise.all([
        // Read-only: studios are provisioned on writer onboarding and on
        // Writer Studio entry, not on every page render.
        user?.id ? getAccessibleStudiosForUser(user.id) : Promise.resolve([]),
        // Cached (lib/layout-data.ts): the same 3 series for everyone.
        getLayoutTrending(),
      ]);
    } catch (error) {
      if (isNextSignal(error)) throw error;
      console.error("Database connection error in layout:", error);
    }

    content = (
      <AppShell
        user={user}
        studios={studios}
        trending={trending}
        renovationMode={renovationMode}
        footerTagline={String(footer.values.tagline)}
        announcement={
          announcement.values.enabled === true
            ? {
                text: String(announcement.values.text),
                linkLabel: String(announcement.values.linkLabel),
                linkHref: String(announcement.values.linkHref),
              }
            : null
        }
      >
        {children}
      </AppShell>
    );
  }

  return (
    // "light" is the server default; THEME_INIT_SCRIPT swaps it for the stored
    // preference before first paint (hence suppressHydrationWarning).
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: READING_INIT_SCRIPT }} />
      </head>
      <body className="bg-[var(--page-bg)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthSessionProvider session={session}>
            <div className="min-h-screen">{content}</div>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
