import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import UserAvatar from "@/components/UserAvatar";
import WriterStatusBadge from "@/components/writer-studio/shell/WriterStatusBadge";

export default function StudioHeader({
  userId,
  name,
  image,
  writerStatus,
}: {
  userId: string;
  name: string;
  image: string | null;
  writerStatus: string | null;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">Writer Studio</p>
        <div className="mt-2 flex min-w-0 items-center gap-3">
          {/* Everyone in the studio is WRITER or above, so the default is the writer one. */}
          <UserAvatar user={{ image, role: "WRITER" }} size="lg" className="hidden sm:block" />
          <UserAvatar user={{ image, role: "WRITER" }} size="md" className="sm:hidden" />
          <h1 className="font-heading theme-heading min-w-0 truncate text-3xl font-semibold md:text-4xl">{name}</h1>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <WriterStatusBadge status={writerStatus} />
          <Link href={`/author/${userId}`} className="theme-meta transition hover:text-[var(--text-primary)]">
            Public profile
          </Link>
          <Link href="/" className="theme-meta transition hover:text-[var(--text-primary)]">
            Exit to library
          </Link>
        </div>
      </div>

      <Link href="/writer-studio/episodes/new" className="story-button-primary gap-2 self-start sm:self-auto">
        <PlusIcon size={16} />
        New episode
      </Link>
    </header>
  );
}
