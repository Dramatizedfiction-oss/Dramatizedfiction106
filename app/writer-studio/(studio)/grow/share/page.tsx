import Link from "next/link";
import GrowCard from "@/components/writer-studio/grow/GrowCard";
import GrowHero from "@/components/writer-studio/grow/GrowHero";
import GrowSection from "@/components/writer-studio/grow/GrowSection";
import ShareLinkRow from "@/components/writer-studio/grow/ShareLinkRow";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { growSection } from "@/lib/grow/sections";
import { getShareableWork } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

// Every link here is a public route. Series and episodes come from
// getShareableWork(), which applies the public visibility rules.
const PLATFORM_LINKS = [
  { label: "Dramatized Fiction", description: "The home page: the best first stop for a new reader.", path: "/" },
  { label: "Explore", description: "Browse every published series.", path: "/explore" },
  {
    label: "Write with us",
    description: "For writers you know who might want to publish here.",
    path: "/write-with-us",
  },
];

export default async function GrowSharePage() {
  const user = await requireStudioUser();
  const series = await getShareableWork(user.id);
  const meta = growSection("/writer-studio/grow/share");

  return (
    <div className="space-y-14">
      <GrowHero
        eyebrow="Share"
        title={meta.title}
        body="The simplest way to grow the platform is to point people to it. Copy any link below and send it wherever you talk about stories."
      />

      <GrowSection title="The platform" intro="Links to Dramatized Fiction itself.">
        <div className="grid gap-3 lg:grid-cols-2">
          {PLATFORM_LINKS.map((link) => (
            <ShareLinkRow key={link.path} {...link} />
          ))}
        </div>
      </GrowSection>

      <GrowSection title="Your author page" intro="One link to everything you've published.">
        <ShareLinkRow
          label="Author page"
          description={
            series.length > 0
              ? `Shows your ${series.length === 1 ? "published series" : `${series.length} published series`}.`
              : "Your page is public now, but it will look empty until you publish your first series."
          }
          path={`/author/${user.id}`}
        />
      </GrowSection>

      <GrowSection title="Your series" intro="Only published series and episodes are listed. Drafts never appear here.">
        {series.length > 0 ? (
          <div className="space-y-6">
            {series.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4 md:p-6"
              >
                <div className="mb-4 px-1">
                  <h3 className="font-heading theme-heading text-xl font-semibold">{item.title}</h3>
                  <p className="theme-meta mt-1 text-sm">
                    {[item.genre, `${item.publishedEpisodes} published episode${item.publishedEpisodes === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <ShareLinkRow
                    label="Series page"
                    description="Cover, description and every episode."
                    path={`/series/${item.id}`}
                    shareTitle={item.title}
                  />
                  <ShareLinkRow
                    label={`Start at Episode ${item.firstEpisode.episodeNumber}`}
                    description="Takes a new reader straight into the story."
                    path={`/episode/${item.firstEpisode.id}`}
                    shareTitle={item.title}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StudioEmptyState
            title="Nothing to share yet"
            description="A series appears here once its first episode is published."
            action={
              <Link href="/writer-studio/series" className="story-button-secondary">
                Go to your series
              </Link>
            }
          />
        )}
      </GrowSection>

      <GrowSection title="More sharing tools">
        <div className="grid gap-3 sm:grid-cols-2">
          <GrowCard
            title="Social media resources"
            body="Guidance and material for sharing on social platforms."
            availability="later"
            href="/writer-studio/grow/social"
          />
          <GrowCard
            title="Promotional material"
            body="Ready-made images and copy for your series."
            availability="later"
          />
        </div>
      </GrowSection>
    </div>
  );
}
