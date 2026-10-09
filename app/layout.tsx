import "./globals.css";
import { auth } from "@/auth";
import AppShell from "@/components/app-shell/AppShell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
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

  return (
    // "light" is the server default; THEME_INIT_SCRIPT swaps it for the stored
    // preference before first paint (hence suppressHydrationWarning).
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-[var(--page-bg)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthSessionProvider session={session}>
            <div className="min-h-screen">
              <AppShell
                user={user}
                studios={studios}
                trending={trending}
              >
                {children}
              </AppShell>
            </div>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
