import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/admin/ui";
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
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONTENT_DEFS.filter((def) => def.section === section.id).map((def) => {
              const item = meta.get(def.key);
              return (
                <li key={def.key} className="min-w-0">
                  <Link
                    href={`/administration/content/${def.key}`}
                    className="theme-panel-hover flex min-h-[88px] items-center gap-3 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="theme-heading block font-semibold">{def.label}</span>
                      <span className="theme-meta mt-1 block text-xs leading-5">
                        {item?.updatedAt
                          ? `Edited by ${item.updatedBy ?? "a former member"} · ${item.updatedAt.slice(0, 10)}`
                          : "Built-in text"}
                      </span>
                    </span>
                    {item?.updatedAt ? <Badge tone="good">Edited</Badge> : <Badge>Built-in</Badge>}
                    <span aria-hidden="true" className="text-[var(--text-muted)]">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
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
