import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import ContentEditor from "@/components/admin/content/ContentEditor";
import { getContentDef } from "@/lib/content/registry";
import { getContentState } from "@/lib/content/service";
import { requireAdministrationPage } from "@/lib/utils";

/* One Administration › Content item's editor (Board and CEO). */
export default async function ContentItemPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  requireAdministrationPage(await auth(), `/administration/content/${key}`);
  const def = getContentDef(key);
  if (!def) notFound();
  const state = await getContentState(key);
  if (!state) notFound();

  return (
    <div>
      <Link href="/administration/content" className="theme-meta -ml-2 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold hover:text-[var(--text-primary)]">
        ‹ Content
      </Link>
      <div className="mt-2">
        <ContentEditor def={def} initial={state} />
      </div>
    </div>
  );
}
