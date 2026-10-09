import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProfileEditor from "@/components/profile/ProfileEditor";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderProfileHeader, { LockIcon } from "@/components/reader/ReaderProfileHeader";
import ReaderProfileTabs from "@/components/reader/ReaderProfileTabs";
import { prisma } from "@/lib/prisma";
import { hasRoleAccess } from "@/lib/roles";
import { getLibrary } from "@/lib/series-follows";
import { requireRole } from "@/lib/utils";

/*
 * The signed-in member's own reading profile, with the profile editor (pen).
 * Others see it at /reader/[id]: the header always, the content (Library…)
 * only when readingProfileVisibility is PUBLIC.
 */
export default async function ReaderProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/reader");
  // Signed in and not restricted (banned/disciplined members go to /account-restricted).
  requireRole(session, ["READER"]);

  const reader = await prisma.user.findUnique({
    where: { id: session.user.id },
    // Own profile fields only.
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      bio: true,
      bannerImage: true,
      createdAt: true,
      readingProfileVisibility: true,
      websiteUrl: true,
      twitterUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      discordUrl: true,
    },
  });
  if (!reader) redirect("/sign-in?callbackUrl=/reader");

  // Only the signed-in member's own follows; never another member's.
  const library = await getLibrary(session.user.id);
  const isPublic = reader.readingProfileVisibility === "PUBLIC";

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader
        reader={reader}
        action={
          <ProfileEditor
            role={reader.role}
            isWriter={hasRoleAccess(reader.role, "WRITER")}
            initial={{
              name: reader.name ?? "",
              bio: reader.bio ?? "",
              image: reader.image ?? "",
              bannerImage: reader.bannerImage ?? "",
              readingProfileVisibility: reader.readingProfileVisibility,
              links: {
                websiteUrl: reader.websiteUrl ?? "",
                twitterUrl: reader.twitterUrl ?? "",
                instagramUrl: reader.instagramUrl ?? "",
                youtubeUrl: reader.youtubeUrl ?? "",
                discordUrl: reader.discordUrl ?? "",
              },
            }}
          />
        }
        note={
          <div className="flex items-start gap-2">
            <span className="mt-0.5">
              <LockIcon />
            </span>
            <p className="min-w-0">
              {isPublic
                ? "Your Library is public to anyone with your profile link."
                : "Your Library is private. Others with your link see only your picture, name and bio."}{" "}
              <Link
                href={`/reader/${reader.id}`}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                See what others see
              </Link>
            </p>
          </div>
        }
      />
      <div className="px-4 pt-6 md:px-0 md:pt-8">
        <ReaderProfileTabs panels={{ library: <ReaderLibrary entries={library} /> }} />
      </div>
    </main>
  );
}
