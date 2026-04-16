import "./globals.css";
import { auth } from "@/auth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

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
          <Navbar user={user} />
          <div className="page-shell">
            <div className="flex flex-col gap-6 lg:flex-row">
              <Sidebar user={user} />
              <div className="min-w-0 flex-1">
                <div className="surface-panel overflow-hidden">{children}</div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
