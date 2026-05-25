export type WriterDraftPreview = {
  id: string;
  title: string;
  seriesTitle: string;
  updatedLabel: string;
  excerpt: string;
  completion: number;
};

export type WriterCharacterPreview = {
  id: string;
  name: string;
  type: "main" | "side";
  notes: string;
};

export type WriterProjectStatus = "Draft" | "Published" | "WIP" | "Scheduled";

export type WriterProjectPreview = {
  id: string;
  title: string;
  type: "Story" | "Series" | "WIP Journey";
  status: WriterProjectStatus;
  lastEdited: string;
  coverTone: string;
  description: string;
  href: string;
};

export type WriterStoryPreview = {
  id: string;
  title: string;
  status: "Draft" | "Published" | "Hidden" | "Scheduled";
  format: "Short Story" | "Serialized Story" | "Pilot";
  lastEdited: string;
  reads: string;
  coverTone: string;
};

export type WriterWipPreview = {
  id: string;
  title: string;
  audiencePromise: string;
  progress: number;
  recentUpdate: string;
  nextMilestone: string;
};

export function getMockWriterDrafts(userId: string): WriterDraftPreview[] {
  const seed = userId.slice(0, 6) || "studio";

  return [
    {
      id: `${seed}-glass-heir`,
      title: "Episode 06: The Glass Heir",
      seriesTitle: "Velvet Signals",
      updatedLabel: "Edited 18 minutes ago",
      excerpt:
        "The corridor hums before the first confession lands, and the room feels smaller with every line.",
      completion: 82,
    },
    {
      id: `${seed}-red-choir`,
      title: "Episode 03: Red Choir",
      seriesTitle: "Ash District",
      updatedLabel: "Edited yesterday",
      excerpt:
        "A witness changes her story in the middle of the ritual and leaves the choir stranded in silence.",
      completion: 61,
    },
    {
      id: `${seed}-storm-ledger`,
      title: "Episode 01: Storm Ledger",
      seriesTitle: "Seventh Static",
      updatedLabel: "Edited 2 days ago",
      excerpt:
        "The opening scene is blocked in, but the emotional handoff between the leads still needs shaping.",
      completion: 39,
    },
    {
      id: `${seed}-hollow-stage`,
      title: "Episode 09: Hollow Stage",
      seriesTitle: "Drownlight",
      updatedLabel: "Edited 4 days ago",
      excerpt:
        "A late twist is drafted, and the set piece is ready for dialogue layering and pacing polish.",
      completion: 74,
    },
    {
      id: `${seed}-midnight-code`,
      title: "Episode 02: Midnight Code",
      seriesTitle: "Lantern Archive",
      updatedLabel: "Edited last week",
      excerpt:
        "The team reaches the archive doors, but the chapter still needs a sharper cliffhanger ending.",
      completion: 27,
    },
  ];
}

export function getMockCharacterDatabase(): WriterCharacterPreview[] {
  return [
    {
      id: "lyra-vale",
      name: "Lyra Vale",
      type: "main",
      notes:
        "Carries the emotional center of the series. Sharp under pressure, but every decisive moment costs her something personal.",
    },
    {
      id: "maren-quill",
      name: "Maren Quill",
      type: "main",
      notes:
        "Strategist with a public calm and a private habit of over-preparing every confrontation.",
    },
    {
      id: "juno-sable",
      name: "Juno Sable",
      type: "side",
      notes:
        "Reliable side character who translates exposition into tension and often signals when a scene is emotionally drifting.",
    },
  ];
}

export function findMockDraftById(userId: string, draftId: string | null | undefined) {
  if (!draftId) {
    return null;
  }

  return getMockWriterDrafts(userId).find((draft) => draft.id === draftId) ?? null;
}

export function getMockRecentProjects(userId: string): WriterProjectPreview[] {
  const seed = userId.slice(0, 6) || "studio";

  return [
    {
      id: `${seed}-velvet-signals`,
      title: "Velvet Signals",
      type: "Series",
      status: "Published",
      lastEdited: "Updated today",
      coverTone: "from-violet-500/60 via-fuchsia-500/30 to-slate-950",
      description: "A polished series hub with momentum from returning readers.",
      href: "/writer-studio/series",
    },
    {
      id: `${seed}-glass-heir-draft`,
      title: "The Glass Heir",
      type: "Story",
      status: "Draft",
      lastEdited: "Edited 18 minutes ago",
      coverTone: "from-cyan-400/50 via-indigo-500/30 to-zinc-950",
      description: "A draft episode ready for one more emotional pass.",
      href: `/writer-studio/editor?draft=${seed}-glass-heir`,
    },
    {
      id: `${seed}-ash-district-wip`,
      title: "Ash District: Behind the Ritual",
      type: "WIP Journey",
      status: "WIP",
      lastEdited: "Updated yesterday",
      coverTone: "from-rose-500/50 via-amber-500/20 to-stone-950",
      description: "A creator update stream for audience-building between releases.",
      href: "/writer-studio/wip-projects",
    },
    {
      id: `${seed}-lantern-archive`,
      title: "Lantern Archive Episode 02",
      type: "Story",
      status: "Scheduled",
      lastEdited: "Scheduled for Friday",
      coverTone: "from-emerald-400/40 via-teal-500/20 to-slate-950",
      description: "A future release with a soft launch window prepared.",
      href: "/writer-studio/scheduling",
    },
  ];
}

export function getMockStories(): WriterStoryPreview[] {
  return [
    {
      id: "story-glass-heir",
      title: "The Glass Heir",
      status: "Draft",
      format: "Serialized Story",
      lastEdited: "18 minutes ago",
      reads: "Private",
      coverTone: "from-cyan-400/50 via-indigo-500/30 to-zinc-950",
    },
    {
      id: "story-red-choir",
      title: "Red Choir",
      status: "Published",
      format: "Pilot",
      lastEdited: "Yesterday",
      reads: "2.4k reads",
      coverTone: "from-rose-500/55 via-red-500/20 to-neutral-950",
    },
    {
      id: "story-storm-ledger",
      title: "Storm Ledger",
      status: "Scheduled",
      format: "Short Story",
      lastEdited: "2 days ago",
      reads: "Releases soon",
      coverTone: "from-amber-300/45 via-sky-500/20 to-slate-950",
    },
    {
      id: "story-hollow-stage",
      title: "Hollow Stage",
      status: "Hidden",
      format: "Serialized Story",
      lastEdited: "Last week",
      reads: "Hidden",
      coverTone: "from-zinc-400/30 via-purple-500/20 to-black",
    },
  ];
}

export function getMockWipProjects(): WriterWipPreview[] {
  return [
    {
      id: "wip-ash-district",
      title: "Ash District: Ritual Notes",
      audiencePromise: "Weekly behind-the-scenes updates while Episode 04 is drafted.",
      progress: 68,
      recentUpdate: "Shared a scene moodboard and asked readers which witness feels least trustworthy.",
      nextMilestone: "Post dialogue pass notes",
    },
    {
      id: "wip-velvet-signals",
      title: "Velvet Signals Season Spine",
      audiencePromise: "A transparent look at how the season arc is being tightened.",
      progress: 42,
      recentUpdate: "Moved the midpoint reveal earlier to give the audience more tension.",
      nextMilestone: "Publish revised episode map",
    },
    {
      id: "wip-lantern-archive",
      title: "Lantern Archive Launch Path",
      audiencePromise: "Invite early followers into naming artifacts and choosing release extras.",
      progress: 25,
      recentUpdate: "Opened the first creator note with three possible artifact titles.",
      nextMilestone: "Add cover direction poll",
    },
  ];
}
