import Link from "next/link";
import GrowCard, { GrowCardGrid } from "@/components/writer-studio/grow/GrowCard";
import GrowHero from "@/components/writer-studio/grow/GrowHero";
import GrowSection from "@/components/writer-studio/grow/GrowSection";
import {
  GROW_INTRO,
  GROW_OPPORTUNITIES,
  GROW_OPPORTUNITIES_NOTE,
  GROW_TEAM_MESSAGE,
  forStatus,
} from "@/lib/grow/content";
import { GROW_SUBSECTIONS } from "@/lib/grow/sections";
import { getWriterProfile } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function GrowOverviewPage() {
  const user = await requireStudioUser();
  const profile = await getWriterProfile(user.id);
  const opportunities = forStatus(GROW_OPPORTUNITIES, profile?.writerStatus);

  return (
    <div className="space-y-14">
      <GrowHero eyebrow={GROW_INTRO.eyebrow} title={GROW_INTRO.title} body={GROW_INTRO.body}>
        <Link href="/writer-studio/grow/share" className="story-button-primary">
          Share Dramatized Fiction
        </Link>
        <Link href="/writer-studio/grow/roadmap" className="story-button-secondary">
          See the roadmap
        </Link>
      </GrowHero>

      <section className="border-l-2 border-[var(--studio-accent)] pl-5 md:pl-8">
        <h2 className="font-heading theme-heading text-2xl font-semibold md:text-3xl">{GROW_TEAM_MESSAGE.title}</h2>
        <p className="theme-body mt-3 max-w-3xl text-base leading-7">{GROW_TEAM_MESSAGE.body}</p>
      </section>

      <GrowSection eyebrow="Explore Grow" title="Where to start">
        <div className="grid gap-3 sm:grid-cols-2">
          {GROW_SUBSECTIONS.map((section) => (
            <GrowCard key={section.href} title={section.title} body={section.summary} href={section.href} />
          ))}
        </div>
      </GrowSection>

      <GrowSection eyebrow="Your opportunities" title="What growth can open up" intro={GROW_OPPORTUNITIES_NOTE}>
        <GrowCardGrid items={opportunities} />
      </GrowSection>
    </div>
  );
}
