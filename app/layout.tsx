export const metadata = {
  title: "Dramatized Fiction",
  description: "A streaming-style fiction platform for serialized stories.",
  icons: {
    icon: "/favicon.ico"
  }
};

import "./globals.css";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200">
        <Navbar user={session?.user || null} />

        <div className="flex">
          <Sidebar user={session?.user || null} />

          <main className="flex-1 min-h-screen">
            {children}
          </main>
         <Footer />
        </div>
      </body>
    </html>
  );
}

