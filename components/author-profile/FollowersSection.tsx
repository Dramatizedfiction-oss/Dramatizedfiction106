import Link from "next/link";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import { followerCountText } from "@/lib/author-follow-rules";
import type { FollowerEntry } from "@/lib/author-follows";
import { profileHref } from "@/lib/profile-links";

/*
 * A writer profile's Followers (Sweep B2), on the Writing view. The count
 * includes everyone; the list shows only followers who chose to be listed
 * (followerListVisibility PUBLIC), the same for visitors and the owner. Hidden
 * entirely when nobody follows. Only picture and display name are shown.
 */
export default function FollowersSection({
  authorId,
  count,
  listedCount,
  followers,
  owner,
}: {
  authorId: string;
  count: number;
  listedCount: number;
  followers: FollowerEntry[];
  owner: boolean;
}) {
  if (count === 0) return null;

  return (
    <section aria-labelledby="profile-followers" className="mt-10">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="profile-followers" className="font-heading theme-heading text-xl font-semibold md:text-2xl">
          Followers
        </h2>
        <span className="theme-meta text-sm">{followerCountText(count)}</span>
        {listedCount > followers.length ? (
          <Link
            href={`/author/${authorId}/followers`}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            See all {listedCount.toLocaleString("en-US")}
          </Link>
        ) : null}
      </div>
      {followers.length ? (
        <FollowerGrid followers={followers} />
      ) : owner ? (
        <p className="theme-meta text-sm">Followers who choose to be listed will appear here. Only you can see this note.</p>
      ) : null}
    </section>
  );
}

export function FollowerGrid({ followers }: { followers: FollowerEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {followers.map((person) => {
        const name = person.name?.trim() || "Reader";
        return (
          <li key={person.id} className="min-w-0">
            <Link
              href={profileHref(person)}
              className="theme-panel-hover flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 pr-3 transition"
            >
              <FramedAvatar user={person} size="md" />
              <span className="theme-heading min-w-0 truncate text-sm font-semibold">{name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
