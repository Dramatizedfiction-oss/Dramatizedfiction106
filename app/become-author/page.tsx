import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BecomeAuthorForm from "@/components/auth/BecomeAuthorForm";
import { isWriter } from "@/lib/roles";

const readerItems = ["Read stories", "Follow creators", "Save content", "Comment and interact"];
const writerItems = [
  "Publish stories",
  "Build a public profile",
  "Create series",
  "Use Writer Studio",
  "Grow an audience",
  "Track projects",
  "Customize creator identity",
];

export default async function BecomeAuthorPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/become-author");
  }

  if (isWriter(session.user.role)) {
    redirect("/writer-studio");
  }

  return (
    <main className="overflow-hidden px-4 py-6 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_18%_0%,rgba(124,58,237,0.22),transparent_68%),radial-gradient(ellipse_35%_30%_at_90%_15%,rgba(59,130,246,0.16),transparent_70%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_380px] lg:items-center">
          <div>
            <p className="eyebrow">Creator Mode</p>
            <h1 className="font-heading theme-heading mt-4 text-5xl font-semibold leading-tight md:text-7xl">
              Build Stories. Grow Your Audience.
            </h1>
            <p className="theme-meta mt-5 max-w-3xl text-base leading-7 md:text-lg">
              Signing up makes you a reader first. Becoming a writer is the intentional step that unlocks Writer Studio, public creator identity, discoverability tools, WIP projects, and future monetization opportunities.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#quick-setup" className="story-button-primary justify-center">
                  Start Your Writer Journey
                </a>
              <Link href="/explore" className="story-button-secondary justify-center">
                Explore First
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-primary)]/70 p-4 shadow-glow">
            <div className="aspect-[4/5] rounded-[24px] bg-gradient-to-br from-violet-500/60 via-fuchsia-500/25 to-slate-950 p-5">
              <div className="flex h-full flex-col justify-between rounded-[20px] border border-white/15 bg-black/25 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/70">Writer Studio</p>
                  <p className="mt-4 font-heading text-4xl font-semibold text-white">Creator Profile</p>
                </div>
                <div className="space-y-3">
                  {["Stories", "WIP Projects", "Audience", "Covers"].map((item) => (
                    <div key={item} className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <RoleCard title="Reader" items={readerItems} />
        <RoleCard title="Writer" items={writerItems} featured />
      </section>

      <section className="mt-8 rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-7">
        <p className="eyebrow">Creator Philosophy</p>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold md:text-4xl">
            Writer identity matters here.
          </h2>
        <p className="theme-meta mt-4 max-w-4xl text-sm leading-7 md:text-base">
          Dramatized Fiction is built around serialized stories, creator growth, and discovery. Early writers help shape the ecosystem: how stories surface, how WIP journeys build trust, and how readers become followers. Marketing, visibility, and audience-building are core platform priorities.
        </p>
      </section>

      <section id="quick-setup" className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <BecomeAuthorForm defaultDisplayName={session.user.name || "New Writer"} />
        <aside className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Unlocks</p>
          <div className="mt-4 space-y-3">
            {[
              "Writer Studio",
              "Public writer profile",
              "Series and story tools",
              "WIP/project systems",
              "Future creator economy setup",
            ].map((item) => (
              <div key={item} className="rounded-[18px] border border-[var(--border-color)] px-4 py-3">
                <p className="theme-heading text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
          {/* TODO: Expand this into full onboarding phases: legal acceptance, WIP setup, monetization, creator marketing, AI-assisted editing, and readability optimization. */}
        </aside>
      </section>
    </main>
  );
}

function RoleCard({
  title,
  items,
  featured = false,
}: {
  title: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <article
      className={`rounded-[28px] border p-6 ${
        featured
          ? "border-violet-400/40 bg-violet-500/10"
          : "border-[var(--border-color)] bg-[var(--bg-secondary)]"
      }`}
    >
      <p className="eyebrow">{title}</p>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="theme-body rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
