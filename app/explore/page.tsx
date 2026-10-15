import { cookies } from "next/headers";
import ExploreBrowse from "@/components/explore/ExploreBrowse";
import { auth } from "@/auth";
import { getExploreCatalogue } from "@/lib/explore-catalogue";
import { EXPLORE_SORT_COOKIE, parseExploreSort, type ExploreSort } from "@/lib/explore-ranking";
import { isWriter } from "@/lib/roles";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; focus?: string; genre?: string; sort?: string };
}) {
  const session = await auth().catch(() => null);
  const query = searchParams?.q?.trim() || "";
  const showBecomeAuthorCta = Boolean(session?.user) && !isWriter(session?.user.role);
  // Trending or Newest: the URL wins, then the choice made earlier this visit.
  const initialSort = parseExploreSort(searchParams?.sort ?? cookies().get(EXPLORE_SORT_COOKIE)?.value);

  let catalogue: Awaited<ReturnType<typeof getExploreCatalogue>> = { series: [], orders: { trending: [], newest: [] } as Record<ExploreSort, string[]> };
  try {
    catalogue = await getExploreCatalogue();
  } catch (error) {
    console.error("Explore stories failed.", error);
  }

  return (
    <ExploreBrowse
      initialQuery={query}
      // "See all" from a series page's "More in [genre]" rail.
      initialGenre={searchParams?.genre}
      // The mobile header's search button links here with ?focus=search.
      autoFocusSearch={searchParams?.focus === "search"}
      showBecomeAuthorCta={showBecomeAuthorCta}
      initialSort={initialSort}
      orders={catalogue.orders}
      stories={catalogue.series.map((series) => ({
        id: series.id,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        genre: series.genre,
        themeColor: series.themeColor,
        authorName: series.authorName,
        reads: series.reads,
        createdAt: series.createdAt.toISOString(),
      }))}
    />
  );
}
