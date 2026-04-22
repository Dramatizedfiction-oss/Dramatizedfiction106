import Link from "next/link";

const featuredStories = [
  {
    id: "velvet-hour",
    title: "The Velvet Hour",
    author: "Lena Vale",
    genre: "Noir Romance",
    summary:
      "A radio actress vanishes between broadcasts, leaving one final script that predicts the city's next crime.",
    reads: "48.2K",
    chapters: 18,
  },
  {
    id: "ash-crown",
    title: "Ash Crown",
    author: "Tobias Wren",
    genre: "Epic Fantasy",
    summary:
      "An exiled heir returns to a kingdom that now worships the dragon he was blamed for killing.",
    reads: "31.6K",
    chapters: 26,
  },
];

const feedStories = [
  {
    id: "midnight-station",
    title: "Midnight Station",
    author: "Eris Rowe",
    genre: "Sci-Fi Mystery",
    blurb: "A last train appears only to people who are about to disappear.",
    reads: "15.3K",
  },
  {
    id: "salt-silk",
    title: "Salt & Silk",
    author: "Mira Sol",
    genre: "Historical Drama",
    blurb: "A seamstress and a smuggler build an empire beneath a flooded port.",
    reads: "11.9K",
  },
  {
    id: "glass-harvest",
    title: "Glass Harvest",
    author: "Cade Mercer",
    genre: "Dark Academia",
    blurb: "At an elite conservatory, every perfect note costs a memory.",
    reads: "9.4K",
  },
  {
    id: "ember-script",
    title: "Ember Script",
    author: "Noa Hart",
    genre: "Fantasy Adventure",
    blurb: "A scribe discovers her ink can rewrite the outcome of battles.",
    reads: "22.1K",
  },
  {
    id: "cinder-line",
    title: "Cinder Line",
    author: "Jules Marrow",
    genre: "Thriller",
    blurb: "One voicemail ties together five strangers and one unsolved fire.",
    reads: "13.7K",
  },
  {
    id: "opal-house",
    title: "Opal House",
    author: "Sera Quinn",
    genre: "Gothic Fiction",
    blurb: "The mansion only opens its east wing when it wants a new resident.",
    reads: "17.8K",
  },
];

const trendingStories = [
  "The Velvet Hour",
  "Ember Script",
  "Ash Crown",
  "Opal House",
];

const popularAuthors = [
  { name: "Lena Vale", focus: "Noir worlds and voice-driven fiction" },
  { name: "Tobias Wren", focus: "High fantasy with cinematic arcs" },
  { name: "Mira Sol", focus: "Lush historical drama and forbidden alliances" },
];

export default function ExplorePage() {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="sticky top-20 z-20 mb-6 rounded-[24px] border border-[var(--border-color)] bg-[var(--header-bg)] px-4 py-4 shadow-sm backdrop-blur-xl md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label className="sr-only" htmlFor="explore-search">
              Search stories and authors
            </label>
            <input
              id="explore-search"
              type="search"
              placeholder="Search stories, authors, or genres"
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[340px]">
            <select className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
              <option>All Genres</option>
              <option>Fantasy</option>
              <option>Thriller</option>
              <option>Drama</option>
              <option>Sci-Fi</option>
            </select>

            <select className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
              <option>Sort: Featured</option>
              <option>Most Read</option>
              <option>Newest</option>
              <option>Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Featured</p>
                <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">
                  Discovery built for dramatized fiction
                </h1>
              </div>
              <Link href="/about" className="story-button-secondary hidden sm:inline-flex">
                Why These Picks
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {featuredStories.map((story) => (
                <article
                  key={story.id}
                  className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6"
                >
                  <p className="eyebrow">{story.genre}</p>
                  <h2 className="font-heading theme-heading mt-3 text-2xl font-semibold">
                    {story.title}
                  </h2>
                  <p className="theme-meta mt-2 text-sm">
                    By {story.author} · {story.reads} reads · {story.chapters} chapters
                  </p>
                  <p className="theme-body mt-4 leading-7">{story.summary}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/series/${story.id}`} className="story-button-primary">
                      Open Story
                    </Link>
                    <button type="button" className="story-button-secondary">
                      Save Preview
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="eyebrow">Main Feed</p>
              <h2 className="font-heading theme-heading mt-2 text-2xl font-semibold">
                Browse the current catalog
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {feedStories.map((story) => (
                <article
                  key={story.id}
                  className="theme-panel theme-panel-hover rounded-[24px] border border-[var(--border-color)] p-5 transition"
                >
                  <p className="theme-meta font-mono-df text-[10px] uppercase tracking-[0.28em]">
                    {story.genre}
                  </p>
                  <h3 className="theme-heading mt-3 text-xl font-semibold">{story.title}</h3>
                  <p className="theme-meta mt-2 text-sm">By {story.author}</p>
                  <p className="theme-body mt-4 text-sm leading-6">{story.blurb}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="theme-meta text-xs">{story.reads} reads</span>
                    <Link href={`/series/${story.id}`} className="story-button-secondary text-xs">
                      View Story
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-28 space-y-4">
            <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
              <p className="eyebrow">Trending</p>
              <h2 className="theme-heading mt-2 text-xl font-semibold">Stories readers are opening now</h2>
              <div className="mt-4 space-y-2">
                {trendingStories.map((story, index) => (
                  <div
                    key={story}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <p className="theme-meta font-mono-df text-[10px] uppercase tracking-[0.28em]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="theme-heading mt-2 text-sm font-medium">{story}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
              <p className="eyebrow">Popular Authors</p>
              <h2 className="theme-heading mt-2 text-xl font-semibold">Writers worth following</h2>
              <div className="mt-4 space-y-3">
                {popularAuthors.map((author) => (
                  <div
                    key={author.name}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
                  >
                    <p className="theme-heading font-medium">{author.name}</p>
                    <p className="theme-meta mt-1 text-sm">{author.focus}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
