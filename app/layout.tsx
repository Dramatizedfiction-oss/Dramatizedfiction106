import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import AppShell from "@/components/app-shell/AppShell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import { ensureUserStudioAccess } from "@/lib/studios";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user || null;

  let searchStories: any[] = [];
  let searchAuthors: any[] = [];
  let studios: any[] = [];

  try {
    [searchStories, searchAuthors, studios] = await Promise.all([
      prisma.series.findMany({
        orderBy: [{ reads: "desc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
        },
      }),
      prisma.user.findMany({
        where: {
          role: {
            in: ["WRITER", "BOARD", "CEO"],
          },
        },
        take: 16,
        select: {
          id: true,
          name: true,
        },
      }),
      user?.id ? ensureUserStudioAccess(user) : Promise.resolve([]),
    ]);
  } catch (error) {
    console.error("Database connection error in layout:", error);
    // Fallback to empty arrays to prevent app crash
  }

  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AuthSessionProvider session={session}>
          <div className="min-h-screen">
            <AppShell
              user={user}
              studios={studios}
              searchStories={searchStories}
              searchAuthors={searchAuthors}
            >
              {children}
            </AppShell>
            <Footer />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
