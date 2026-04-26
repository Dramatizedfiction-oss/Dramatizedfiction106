import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import AppShell from "@/components/app-shell/AppShell";
import NeonAuthProvider from "@/components/providers/NeonAuthProvider";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user || null;

  const [searchStories, searchAuthors] = await Promise.all([
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
          in: ["AUTHOR", "ADMIN", "CEO"],
        },
      },
      take: 16,
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <NeonAuthProvider>
          <div className="min-h-screen">
            <AppShell
              user={user}
              searchStories={searchStories}
              searchAuthors={searchAuthors}
            >
              {children}
            </AppShell>
            <Footer />
          </div>
        </NeonAuthProvider>
      </body>
    </html>
  );
}
