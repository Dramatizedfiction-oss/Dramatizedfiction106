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
import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { getAccessibleStudiosForUser } from "@/lib/studios";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch((error) => {
    console.error("Root layout auth lookup failed. Rendering as guest.", error);
    return null;
  });
  const user = session?.user || null;
  const pathname = headers().get(PATHNAME_HEADER) ?? "";

  const renovationMode = await getPlatformSettings()
    .then((settings) => settings.renovationMode)
    .catch((error) => {
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

    try {
      [studios, trending] = await Promise.all([
        // Read-only: studios are provisioned on writer onboarding and on
        // Writer Studio entry, not on every page render.
        user?.id ? getAccessibleStudiosForUser(user.id) : Promise.resolve([]),
        prisma.series.findMany({
          where: PUBLIC_SERIES_WHERE,
          orderBy: [{ reads: "desc" }, { followers: "desc" }],
          take: 3,
          select: {
            id: true,
            title: true,
            genre: true,
            reads: true,
            themeColor: true,
          },
        }),
      ]);
    } catch (error) {
      console.error("Database connection error in layout:", error);
    }

    content = (
      <AppShell user={user} studios={studios} trending={trending} renovationMode={renovationMode}>
        {children}
      </AppShell>
    );
  }

  return (
    // "light" is the server default; THEME_INIT_SCRIPT swaps it for the stored
    // preference before first paint (hence suppressHydrationWarning).
    <html lang="en" className="light" suppressHydrationWarning>
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
