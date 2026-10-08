import StudioHeader from "@/components/writer-studio/shell/StudioHeader";
import StudioNav from "@/components/writer-studio/shell/StudioNav";
import { getWriterProfile } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudioUser();
  const profile = await getWriterProfile(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16 md:px-8 md:pt-8">
      <StudioHeader
        userId={user.id}
        name={profile?.name || user.name || "Writer"}
        writerStatus={profile?.writerStatus ?? null}
      />
      <StudioNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
