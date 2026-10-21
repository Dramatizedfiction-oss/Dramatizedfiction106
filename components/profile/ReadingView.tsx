import LibraryShelves from "@/components/reader/LibraryShelves";
import ReaderActivity from "@/components/reader/ReaderActivity";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import { LockIcon } from "@/components/reader/ReaderProfileHeader";
import ReaderProfileTabs from "@/components/reader/ReaderProfileTabs";
import { listActivity } from "@/lib/activity";
import { listFollowedAuthors } from "@/lib/author-follows";
import { countBookmarks, listBookmarks } from "@/lib/bookmarks";
import type { LibraryShelf } from "@/lib/library-shelves";
import { getLibrary } from "@/lib/series-follows";

/*
 * A member's Reading view (reading profile and the author profile's Reading
 * view). This is where a member's platform interaction lives (Sweep B2): who
 * and what they follow. Only ever loads data for `member`, the profile shown:
 *   - the owner: Library (sections Followed Series, Bookmarks, Follows, each
 *     item removable with Undo) and Activity tabs;
 *   - anyone else: Followed Series if readingProfileVisibility is PUBLIC,
 *     Activity if activityVisibility is PUBLIC, never Bookmarks or Follows (a
 *     follower who hid from writers' follower lists stays hidden); otherwise a
 *     private notice.
 */
export function readingIsVisible(member: { readingProfileVisibility: string; activityVisibility: string }) {
  return member.readingProfileVisibility === "PUBLIC" || member.activityVisibility === "PUBLIC";
}

export default async function ReadingView({
  member,
  isOwner,
  shelf = "following",
}: {
  member: { id: string; readingProfileVisibility: string; activityVisibility: string };
  isOwner: boolean;
  /** The owner's Library section to scroll to (?shelf=). */
  shelf?: LibraryShelf;
}) {
  if (isOwner) {
    const [library, bookmarks, bookmarkTotal, people, activity] = await Promise.all([
      getLibrary(member.id),
      listBookmarks(member.id),
      countBookmarks(member.id),
      listFollowedAuthors(member.id),
      listActivity(member.id),
    ]);
    return (
      <ReaderProfileTabs
        panels={{
          library: (
            <LibraryShelves initialShelf={shelf} series={library} bookmarks={bookmarks} bookmarkTotal={bookmarkTotal} people={people} />
          ),
          activity: <ReaderActivity readerId={member.id} initial={activity} />,
        }}
      />
    );
  }

  const libraryPublic = member.readingProfileVisibility === "PUBLIC";
  const activityPublic = member.activityVisibility === "PUBLIC";
  const [library, activity] = await Promise.all([
    libraryPublic ? getLibrary(member.id) : null,
    activityPublic ? listActivity(member.id) : null,
  ]);

  if (!library && !activity) {
    return (
      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
          <LockIcon />
        </span>
        <h2 className="font-heading theme-heading mt-4 text-balance text-2xl font-semibold">This reading profile is private</h2>
        <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">This reader keeps their Library and Activity to themselves.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {library ? (
        <section aria-labelledby="library-heading">
          <h2 id="library-heading" className="eyebrow mb-3">
            Followed Series
          </h2>
          <ReaderLibrary entries={library} visitor />
        </section>
      ) : null}
      {activity ? (
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="eyebrow mb-3">
            Activity
          </h2>
          <ReaderActivity readerId={member.id} initial={activity} visitor />
        </section>
      ) : null}
    </div>
  );
}
