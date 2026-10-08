import Link from "next/link";
import GrowCard, { GrowCardGrid } from "@/components/writer-studio/grow/GrowCard";
import GrowHero from "@/components/writer-studio/grow/GrowHero";
import GrowSection from "@/components/writer-studio/grow/GrowSection";
import { AUDIENCE_INTRO, AUDIENCE_PLANNED, AUDIENCE_STARTING_POINTS, forStatus } from "@/lib/grow/content";
import { growSection } from "@/lib/grow/sections";
import { getWriterProfile } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function GrowAudiencePage() {
  const user = await requireStudioUser();
  const profile = await getWriterProfile(user.id);
  const meta = growSection("/writer-studio/grow/audience");

  return (
    <div className="space-y-14">
      <GrowHero eyebrow="Your audience" title={meta.title} body={AUDIENCE_INTRO}>
        <Link href="/writer-studio/grow/share" className="story-button-primary">
          Share your work
        </Link>
        <Link href="/writer-studio/stats" className="story-button-secondary">
          See your stats
        </Link>
      </GrowHero>

      <GrowSection title="Starting points" intro="Things you can do today with the tools that already exist.">
        <GrowCardGrid items={forStatus(AUDIENCE_STARTING_POINTS, profile?.writerStatus)} columns={2} />
      </GrowSection>

      <GrowSection title="More to come">
        <GrowCard title="Audience-building guides" body={AUDIENCE_PLANNED} availability="later" />
      </GrowSection>
    </div>
  );
}
