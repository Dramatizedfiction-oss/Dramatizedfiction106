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
