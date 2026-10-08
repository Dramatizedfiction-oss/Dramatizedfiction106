// Client-safe labels for publication and writer status.

export type EpisodeStatusValue = "DRAFT" | "REVIEW" | "PUBLISHED";
export type WriterStatusValue = "BEGINNER" | "FULL" | "FEATURED" | "ELITE";

export function isLive(status: EpisodeStatusValue | string) {
  return status === "PUBLISHED";
}

export function episodeStatusLabel(status: EpisodeStatusValue | string) {
  // REVIEW exists in the schema but nothing sets it; it behaves as a draft.
  return isLive(status) ? "Live" : "Draft";
}

export function seriesStatusLabel(status: "DRAFT" | "PUBLISHED" | string) {
  return status === "PUBLISHED" ? "Live" : "Not published yet";
}

export const WRITER_STATUS_LABELS: Record<WriterStatusValue, string> = {
  BEGINNER: "Beginner writer",
  FULL: "Full writer",
  FEATURED: "Featured writer",
  ELITE: "Elite writer",
};

export function writerStatusLabel(status: string | null | undefined) {
  return WRITER_STATUS_LABELS[(status as WriterStatusValue) || "BEGINNER"] ?? WRITER_STATUS_LABELS.BEGINNER;
}
