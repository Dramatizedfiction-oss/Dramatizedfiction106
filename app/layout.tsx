import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import AppShell from "@/components/app-shell/AppShell";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import { ensureUserStudioAccess } from "@/lib/studios";

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

  try {
    studios = user?.id ? await ensureUserStudioAccess(user) : [];
  } catch (error) {
    console.error("Database connection error in layout:", error);
  }

  return (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AuthSessionProvider session={session}>
          <div className="min-h-screen">
            <AppShell user={user} studios={studios}>
              {children}
            </AppShell>
            <Footer />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}