import type { ReactNode } from "react";
import UserAvatar from "@/components/UserAvatar";

export type ReaderProfileHeaderData = {
  name: string | null;
  image: string | null;
  role: string | null;
  bio: string | null;
  bannerImage: string | null;
  createdAt: Date;
};

/**
 * Reading-profile header, laid out like the author page: banner, overlapping
 * circular avatar, name, bio. `action` is the owner's edit (pen) button;
 * `note` is a line under the bio (e.g. who can see the page).
 */
export default function ReaderProfileHeader({
  reader,
  action,
  note,
}: {
  reader: ReaderProfileHeaderData;
  action?: ReactNode;
  note?: ReactNode;
}) {
  const displayName = reader.name?.trim() || "Reader";
  const memberSince = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(reader.createdAt);

  return (
    <section className="overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="relative h-36 sm:h-48 md:h-72">
        {reader.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reader.bannerImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.3),transparent_45%),linear-gradient(135deg,var(--accent-soft),var(--bg-primary))]" />
        )}
      </div>

      <div className="relative px-5 pb-8 sm:px-6 md:px-8">
        {action ? <div className="absolute right-4 top-3 sm:right-6 md:right-8">{action}</div> : null}
        {/* The avatar overlaps the banner. Phones: the name sits below it. Wider:
            beside it, starting just under the banner edge so a long name never
            runs up into the banner image. */}
        <div className="-mt-12 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:gap-4 md:-mt-16">
          <UserAvatar
            user={{ image: reader.image, role: reader.role }}
            size="xl"
            label={displayName}
            className="border-4 border-[var(--bg-secondary)]"
          />
          <div className="min-w-0 sm:pt-14 md:pt-[4.5rem]">
            <p className="eyebrow">Reader Profile</p>
            <h1 className="font-heading theme-heading mt-2 break-words text-3xl font-semibold sm:text-4xl md:text-5xl">
              {displayName}
            </h1>
            <p className="theme-meta mt-2 text-sm">Reading since {memberSince}</p>
          </div>
        </div>

        {reader.bio ? <p className="theme-body mt-5 max-w-3xl text-base leading-7 md:text-lg">{reader.bio}</p> : null}

        {note ? <div className="theme-meta mt-5 text-xs">{note}</div> : null}
      </div>
    </section>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
