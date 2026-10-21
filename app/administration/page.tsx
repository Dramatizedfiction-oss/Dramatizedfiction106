import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Panel, Stat } from "@/components/admin/ui";
import { MAX_BOARD_MEMBERS } from "@/lib/admin/policy";
import { getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { requireAdministrationPage } from "@/lib/utils";

export default async function AdministrationOverviewPage() {
  requireAdministrationPage(await auth());
  const now = new Date();

  const [roleGroups, banned, disciplined, settings] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { restrictions: { some: { kind: "BAN", liftedAt: null } } } }),
    prisma.user.count({
      where: {
        restrictions: { some: { kind: "DISCIPLINE", liftedAt: null, endsAt: { gt: now } }, none: { kind: "BAN", liftedAt: null } },
      },
    }),
    getPlatformSettings(),
  ]);
  const roles = Object.fromEntries(roleGroups.map((group) => [group.role, group._count._all])) as Record<string, number>;
  const total = Object.values(roles).reduce((sum, count) => sum + count, 0);

  const links = [
    { href: "/administration/members", title: "Members", body: "Search members, moderate accounts and manage Board seats." },
    { href: "/administration/reports", title: "Reports", body: "Reported comments and AI tags: review, remove or dismiss." },
    { href: "/administration/analytics", title: "Analytics", body: "Accounts, published content and reading activity." },
    { href: "/administration/feed", title: "Feed", body: "Explore's shelves: weights, on/off, tag shelves, Staff Picks, score breakdowns, holds and signals." },
    { href: "/administration/content", title: "Content", body: "Site text: onboarding, About, AI Usage, legal pages, home, footer and the announcement banner." },
    { href: "/administration/store", title: "Store", body: "Avatars members can choose, their order, and the Reader and Writer defaults." },
    { href: "/administration/renovation", title: "Renovation Mode", body: "Temporarily close the platform while major changes are made." },
  ];

  return (
    <div className="space-y-8">
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members" value={total.toLocaleString()} />
        <Stat label="Board seats" value={`${roles.BOARD ?? 0}/${MAX_BOARD_MEMBERS}`} />
        <Stat label="Disciplined" value={disciplined.toLocaleString()} />
        <Stat label="Banned" value={banned.toLocaleString()} />
      </section>

      <Panel
        title="Renovation Mode"
        action={settings.renovationMode ? <Badge tone="warn">On</Badge> : <Badge tone="good">Off: site open</Badge>}
        description={
          settings.renovationMode
            ? "The public sees the renovation page. Only the CEO and Board can use the site."
            : "The platform is open to everyone."
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="theme-panel rounded-2xl border p-5 transition hover:border-[var(--border-strong)]"
          >
            <p className="theme-heading font-semibold">{link.title}</p>
            <p className="theme-meta mt-1 text-sm leading-6">{link.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
