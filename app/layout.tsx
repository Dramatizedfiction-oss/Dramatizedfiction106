import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import AppShell from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user || null;
  const trendingStories = await prisma.series.findMany({
    orderBy: [{ reads: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      title: true,
      description: true,
      reads: true,
    },
  });

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <AppShell user={user} trendingStories={trendingStories}>
            {children}
          </AppShell>
          <Footer />
        </div>
      </body>
    </html>
  );
}
