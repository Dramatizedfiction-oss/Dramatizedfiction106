import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import FramedAvatar from "@/components/avatar/FramedAvatar";
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
          {/* The writer's level frame: full design on wider screens, a ring on phones. */}
          <FramedAvatar user={{ image, role: "WRITER", writerStatus }} size="lg" eager className="!hidden sm:!inline-flex" />
          <FramedAvatar user={{ image, role: "WRITER", writerStatus }} size="md" eager className="sm:!hidden" />
          <h1 className="font-heading theme-heading min-w-0 truncate text-3xl font-semibold md:text-4xl">{name}</h1>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <WriterStatusBadge status={writerStatus} />
          {/* Opens the profile exactly as visitors see it (no pen, no owner prompts). */}
          <Link href={`/author/${userId}?as=visitor`} className="theme-meta transition hover:text-[var(--text-primary)]">
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
