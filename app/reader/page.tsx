import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProfileEditor from "@/components/profile/ProfileEditor";
import ReadingView from "@/components/profile/ReadingView";
import ReaderProfileHeader, { LockIcon } from "@/components/reader/ReaderProfileHeader";
import { prisma } from "@/lib/prisma";
import { isWriterRole, profileHref } from "@/lib/profile-links";
import { hasRoleAccess } from "@/lib/roles";
import { requireRole } from "@/lib/utils";

/*
 * A reader's own reading profile, with the profile editor (pen). Writers are
 * sent to their author profile's Reading view instead (lib/profile-links.ts).
 * Others see it at /reader/[id]: the header always, the Library when
 * readingProfileVisibility is PUBLIC, Activity when activityVisibility is
 * PUBLIC. Bookmarks are only ever shown to their owner.
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
      writerStatus: true,
      bio: true,
      bannerImage: true,
      createdAt: true,
      readingProfileVisibility: true,
      activityVisibility: true,
      websiteUrl: true,
      twitterUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      discordUrl: true,
    },
  });
  if (!reader) redirect("/sign-in?callbackUrl=/reader");
  // A writer's profile is their author profile; their reading lives in its Reading view.
  if (isWriterRole(reader.role)) redirect(profileHref(reader, "reading"));

  const isPublic = reader.readingProfileVisibility === "PUBLIC";
  const activityPublic = reader.activityVisibility === "PUBLIC";

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader
        reader={reader}
        action={
          <ProfileEditor
            role={reader.role}
            isWriter={hasRoleAccess(reader.role, "WRITER")}
            initial={{
              bio: reader.bio ?? "",
              image: reader.image ?? "",
              bannerImage: reader.bannerImage ?? "",
              readingProfileVisibility: reader.readingProfileVisibility,
              activityVisibility: reader.activityVisibility,
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
              {`Library: ${isPublic ? "public" : "private"} · Activity: ${activityPublic ? "public" : "private"}. `}
              {isPublic || activityPublic
                ? "Anyone with your profile link sees what's public."
                : "Others with your link see only your picture, name and bio."}{" "}
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
        {/* Only the signed-in member's own follows, bookmarks and activity; never another member's. */}
        <ReadingView member={reader} isOwner />
      </div>
    </main>
  );
}
