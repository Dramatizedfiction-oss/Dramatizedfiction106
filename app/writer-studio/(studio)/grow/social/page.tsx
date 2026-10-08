import Link from "next/link";
import { GrowCardGrid } from "@/components/writer-studio/grow/GrowCard";
import GrowHero from "@/components/writer-studio/grow/GrowHero";
import GrowSection from "@/components/writer-studio/grow/GrowSection";
import { SOCIAL_INTRO, SOCIAL_PLANNED, forStatus } from "@/lib/grow/content";
import { growSection } from "@/lib/grow/sections";
import { getWriterProfile } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function GrowSocialPage() {
  const user = await requireStudioUser();
  const profile = await getWriterProfile(user.id);
  const meta = growSection("/writer-studio/grow/social");

  return (
    <div className="space-y-14">
      <GrowHero eyebrow="Social media" title={meta.title} body={SOCIAL_INTRO}>
        <Link href="/writer-studio/grow/share" className="story-button-primary">
          Get your links
        </Link>
      </GrowHero>

      <GrowSection
        title="Coming to this section"
        intro="These resources are being prepared. Until then, the links on the Share page are ready to post anywhere."
      >
        <GrowCardGrid items={forStatus(SOCIAL_PLANNED, profile?.writerStatus)} columns={2} />
      </GrowSection>
    </div>
  );
}
