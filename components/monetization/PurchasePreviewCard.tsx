import type { ContentAccessStatus } from "@/lib/monetization";
import ContentAccessBadge from "@/components/monetization/ContentAccessBadge";
import PhaseLockedPreview from "@/components/monetization/PhaseLockedPreview";

export default function PurchasePreviewCard({
  contentType,
  accessStatus,
  price,
}: {
  contentType: "series" | "episode";
  accessStatus: ContentAccessStatus;
  price: number | null;
}) {
  const buttonLabel =
    accessStatus === "owned"
      ? `Owned ${contentType === "series" ? "Series" : "Episode"}`
      : `Buy ${contentType === "series" ? "Series" : "Episode"}`;

  return (
    <PhaseLockedPreview
      title="Direct Purchase"
      description="Direct purchases permanently unlock content and pay out 100% to the author. Payment processing stays dormant until Phase 2."
    >
      <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-heading text-sm font-semibold">
              {contentType === "series" ? "Series purchase" : "Episode purchase"}
            </p>
            <p className="theme-meta mt-1 text-xs">
              {price !== null ? `$${price.toFixed(2)}` : "Pricing placeholder"}
            </p>
          </div>
          <ContentAccessBadge accessStatus={accessStatus} />
        </div>

        <button type="button" disabled className="story-button-secondary mt-4 w-full justify-center opacity-70">
          {buttonLabel}
        </button>
      </div>
    </PhaseLockedPreview>
  );
}
