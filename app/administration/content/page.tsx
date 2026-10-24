import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/admin/ui";
import { Group, Row, RowChevron } from "@/components/ui/Surface";
import { CONTENT_DEFS, CONTENT_SECTIONS } from "@/lib/content/registry";
import { listContentMeta } from "@/lib/content/service";
import { requireAdministrationPage } from "@/lib/utils";

/*
 * Administration › Content (Sweep B3): every editable text on the site, by
 * section, with who edited it last. Board and CEO. Each item opens its own
 * editor at /administration/content/[key].
 */
export default async function ContentPage() {
  requireAdministrationPage(await auth(), "/administration/content");
  const meta = new Map((await listContentMeta()).map((item) => [item.key, item]));

  return (
    <div className="space-y-10">
      <p className="theme-meta max-w-2xl text-sm leading-6">
        The text visitors see across the site. Every save keeps a version you can restore, and if anything here is ever missing or
        broken the site shows its built-in text instead.
      </p>

      {CONTENT_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`content-${section.id}`}>
          <h2 id={`content-${section.id}`} className="font-heading theme-heading text-xl font-semibold">
            {section.label}
          </h2>
          <p className="theme-meta mt-1 text-sm">{section.description}</p>
          {/* One grouped list per section (Sweep E): rows with the last edit and a status badge. */}
          <Group className="mt-4">
            {CONTENT_DEFS.filter((def) => def.section === section.id).map((def) => {
              const item = meta.get(def.key);
              return (
                <Row
                  key={def.key}
                  href={`/administration/content/${def.key}`}
                  title={def.label}
                  description={
                    item?.updatedAt ? `Edited by ${item.updatedBy ?? "a former member"} · ${item.updatedAt.slice(0, 10)}` : "Built-in text"
                  }
                  trailing={
                    <span className="flex shrink-0 items-center gap-2">
                      {item?.updatedAt ? <Badge tone="good">Edited</Badge> : <Badge>Built-in</Badge>}
                      <RowChevron />
                    </span>
                  }
                />
              );
            })}
          </Group>
        </section>
      ))}

      <section aria-labelledby="content-store">
        <h2 id="content-store" className="font-heading theme-heading text-xl font-semibold">
          Store
        </h2>
        <p className="theme-meta mt-1 text-sm">Items members can choose, such as avatars, and the Reader and Writer defaults.</p>
        <Link href="/administration/back-of-store" className="story-button-secondary mt-4 min-h-11">
          Open the Back of the store
        </Link>
      </section>
    </div>
  );
}
