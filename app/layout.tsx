import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import AppShell from "@/components/app-shell/AppShell";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user || null;

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <AppShell user={user}>{children}</AppShell>
          <Footer />
        </div>
      </body>
    </html>
  );
}
