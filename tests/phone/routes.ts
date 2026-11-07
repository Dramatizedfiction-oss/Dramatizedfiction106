import { prisma } from "@/lib/prisma";
import { CONTENT_DEFS } from "@/lib/content/registry";
import type { Fixtures } from "./fixtures";

/*
 * Every screen the phone checker visits, with the role it's seen as. Pages
 * that look the same for several roles are visited once, in the role that
 * sees the most (the account menu, Studio links).
 */

export type Role = "anon" | "reader" | "empty" | "writer" | "board" | "ceo";
export type Visit = {
  path: string;
  role: Role;
  /** Short screen name for the report. */
  screen: string;
  /** Optional interaction before checking: open a layer (menu, sheet). */
  open?: { label: string; selector: string };
};

const MENU = { label: "menu open", selector: "button[aria-label='Open menu']" };
const ACCOUNT = { label: "account menu open", selector: "header [aria-label^='Account menu']" };

export async function buildVisits(fx: Fixtures): Promise<Visit[]> {
  // A catalogue series (many episodes, other writers' rows) when the database has one.
  const catalogue = await prisma.series.findFirst({
    where: { status: "PUBLISHED", authorId: { not: fx.writer.id }, episodes: { some: { status: "PUBLISHED" } } },
    orderBy: { episodes: { _count: "desc" } },
    select: { id: true, authorId: true, episodes: { where: { status: "PUBLISHED" }, orderBy: { episodeNumber: "asc" }, take: 1, select: { id: true } } },
  });
  const draft = await prisma.episode.findFirst({
    where: { series: { authorId: fx.writer.id }, status: { not: "PUBLISHED" } },
    select: { id: true },
  });
  const contentKey = CONTENT_DEFS[0]?.key;

  const S = fx.seriesId;
  const E = fx.episodeIds[0];
  const W = fx.writer.id;
  const v = (role: Role, screen: string, path: string, open?: Visit["open"]): Visit => ({ role, screen, path, open });

  const visits: Visit[] = [
    // Signed out.
    v("anon", "Home", "/"),
    v("anon", "Home · menu", "/", MENU),
    v("anon", "Explore", "/explore"),
    v("anon", "Explore · newest", "/explore?sort=newest"),
    v("anon", "Series (edge cases)", `/series/${S}`),
    v("anon", "Series · season sheet", `/series/${S}`, { label: "season sheet open", selector: "button[aria-haspopup='dialog']" }),
    v("anon", "Series · episode menu", `/series/${S}`, { label: "episode menu open", selector: "button[aria-label^='More for']" }),
    v("anon", "Series · all episodes", `/series/${S}/episodes`),
    v("anon", "Series (one episode)", `/series/${fx.singleSeriesId}`),
    v("anon", "Reader (edge cases)", `/episode/${E}`),
    v("anon", "Writer profile", `/author/${W}`),
    v("anon", "Writer works", `/author/${W}/works`),
    v("anon", "Writer followers", `/author/${W}/followers`),
    v("anon", "Sign in", "/sign-in"),
    v("anon", "Sign up", "/sign-up"),
    v("anon", "Forgot password", "/forgot-password"),
    v("anon", "Terms", "/terms"),
    v("anon", "Privacy", "/privacy"),
    v("anon", "Guidelines", "/guidelines"),
    v("anon", "Copyright", "/copyright"),
    v("anon", "Cookies", "/cookies"),
    v("anon", "Contact", "/contact"),
    v("anon", "About", "/about"),
    v("anon", "AI usage", "/ai-usage"),
    v("anon", "Write with us", "/write-with-us"),
    v("anon", "Error 404 (status page)", "/status/404"),
    v("anon", "Error 500", "/status/500"),
    v("anon", "Unknown URL", "/no-such-page-phone-check"),

    // Reader with activity.
    v("reader", "Home (signed in)", "/"),
    v("reader", "Home · account menu", "/", ACCOUNT),
    v("reader", "Explore (signed in)", "/explore"),
    v("reader", "Series (signed in)", `/series/${S}`),
    v("reader", "Reader (signed in)", `/episode/${E}`),
    v("reader", "Library", "/reader"),
    v("reader", "Library · activity", "/reader", { label: "Activity tab", selector: "role=tab[name='Activity']" }),
    v("reader", "Avatar", "/reader/avatar"),
    v("reader", "Store", "/store"),
    v("reader", "Settings", "/settings"),
    v("reader", "Settings · account", "/settings/account"),
    v("reader", "Settings · delete account", "/settings/account/delete"),
    v("reader", "Settings · reading", "/settings/reading"),
    v("reader", "Settings · about", "/settings/about"),
    v("reader", "Become a writer", "/become-author"),
    v("reader", "Writer profile (reader view)", `/author/${W}?view=reading`),

    // Reader with nothing saved.
    v("empty", "Library (empty)", "/reader"),
    v("empty", "Other reader's profile", `/reader/${fx.reader.id}`),

    // Writer.
    v("writer", "Writer profile (own)", `/author/${W}`),
    v("writer", "Writer profile editor", `/author/${W}?edit=1`),
    v("writer", "Writer reading view", `/author/${W}?view=reading`),
    v("writer", "Studio home", "/writer-studio"),
    v("writer", "Studio series list", "/writer-studio/series"),
    v("writer", "Studio new series", "/writer-studio/series/new"),
    v("writer", "Studio series", `/writer-studio/series/${S}`),
    v("writer", "Studio episodes", "/writer-studio/episodes"),
    v("writer", "Studio stats", "/writer-studio/stats"),
    v("writer", "Studio grow", "/writer-studio/grow"),
    v("writer", "Studio grow · share", "/writer-studio/grow/share"),
    v("writer", "Studio guidelines", "/writer-studio/guidelines"),
    v("writer", "Editor · write", `/writer-studio/episodes/${E}`),
    v("writer", "Editor · publish", `/writer-studio/episodes/${E}?step=publish`),
    v("writer", "Editor · preview", `/writer-studio/episodes/${E}/preview`),
    ...(draft ? [v("writer", "Editor · draft", `/writer-studio/episodes/${draft.id}`)] : []),

    // Board.
    v("board", "Administration", "/administration"),
    v("board", "Admin · members", "/administration/members"),
    v("board", "Admin · member", `/administration/members/${fx.reader.id}`),
    v("board", "Admin · reports", "/administration/reports"),
    v("board", "Admin · AI-tag reports", "/administration/reports?kind=ai-tags"),
    v("board", "Admin · analytics", "/administration/analytics"),
    v("board", "Admin · back of the store", "/administration/back-of-store"),
    v("board", "Admin · avatars", "/administration/back-of-store/avatars"),
    v("board", "Admin · frames", "/administration/back-of-store/frames"),
    v("board", "Admin · feed", "/administration/feed"),
    v("board", "Admin · feed series", `/administration/feed/series/${S}`),
    v("board", "Admin · signals", "/administration/feed/signals"),
    v("board", "Admin · content", "/administration/content"),
    ...(contentKey ? [v("board", "Admin · content editor", `/administration/content/${contentKey}`)] : []),
    v("board", "Admin · renovation", "/administration/renovation"),

    // CEO.
    v("ceo", "CEO Studio", "/ceo-studio"),
    v("ceo", "CEO Studio · phase 2", "/ceo-studio/phases/2"),
    v("ceo", "Goal", "/goal"),
    v("ceo", "Old /command-center", "/command-center"),
    v("ceo", "Old /ceo/users", "/ceo/users"),
  ];

  if (catalogue) {
    visits.push(
      v("reader", "Series (catalogue)", `/series/${catalogue.id}`),
      v("reader", "Writer profile (catalogue)", `/author/${catalogue.authorId}`),
    );
    if (catalogue.episodes[0]) visits.push(v("reader", "Reader (catalogue)", `/episode/${catalogue.episodes[0].id}`));
  }
  return visits;
}

/** Reduced set for the smoke test: the screens most people use, signed out and signed in. */
export function smokeVisits(all: Visit[]) {
  const keep = new Set([
    "Home", "Home · menu", "Explore", "Series (edge cases)", "Reader (edge cases)", "Writer profile", "Sign in", "Sign up",
    "Terms", "Library", "Settings", "Settings · account", "Studio home", "Editor · write", "Editor · publish", "Administration",
  ]);
  return all.filter((visit) => keep.has(visit.screen));
}
