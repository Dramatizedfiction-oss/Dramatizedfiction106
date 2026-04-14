import "./globals.css";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="flex">
        <Sidebar user={session?.user || null} />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
