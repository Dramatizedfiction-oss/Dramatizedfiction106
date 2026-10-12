import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AvatarPlace from "@/components/avatar/AvatarPlace";
import { listLibraryAvatars } from "@/lib/avatar-library";
import { photoState } from "@/lib/avatar-photo";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/utils";

/*
 * The avatar place: the signed-in member's own picture, opened from the
 * profile editor's "Choose avatar" row. Full screen on phones, a large panel
 * on desktop.
 */
export const metadata = { title: "Your avatar" };

export default async function AvatarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/reader/avatar");
  requireRole(session, ["READER"]);

  const [member, library] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        role: true,
        writerStatus: true,
        image: true,
        avatarOriginalUrl: true,
        avatarCropX: true,
        avatarCropY: true,
        avatarZoom: true,
      },
    }),
    listLibraryAvatars(),
  ]);
  if (!member) redirect("/sign-in?callbackUrl=/reader/avatar");

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 py-5 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl md:rounded-[32px] md:border md:border-[var(--border-color)] md:bg-[var(--bg-secondary)] md:p-10 md:shadow-[var(--shadow-card)]">
        <Link
          href="/reader"
          className="theme-meta -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm transition hover:text-[var(--text-primary)]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 4.5L7 10l5.5 5.5" />
          </svg>
          Profile
        </Link>
        <h1 className="font-heading theme-heading mb-6 mt-1 text-3xl font-semibold md:text-4xl">Your avatar</h1>
        <AvatarPlace
          member={{ name: member.name?.trim() || "Member", role: member.role, writerStatus: member.writerStatus }}
          initial={photoState(member)}
          library={library}
        />
      </div>
    </main>
  );
}
