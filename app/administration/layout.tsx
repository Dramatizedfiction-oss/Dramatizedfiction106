import { auth } from "@/auth";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdministrationPage } from "@/lib/utils";
import { isCEO } from "@/lib/roles";

// Administration: CEO and Board. Every page and API repeats the server-side
// check (layouts don't re-run on client-side navigation).
export default async function AdministrationLayout({ children }: { children: React.ReactNode }) {
  const user = requireAdministrationPage(await auth());

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 md:px-8 md:pt-8">
      <header>
        <p className="eyebrow">{isCEO(user.role) ? "CEO" : "Board"}</p>
        <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">Administration</h1>
        <p className="theme-meta mt-2 max-w-2xl text-sm">Manage members, see how the platform is doing, and run day-to-day operations.</p>
      </header>
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
