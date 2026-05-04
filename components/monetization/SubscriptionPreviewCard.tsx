import type { MonetizedUser } from "@/lib/monetization";
import PhaseLockedPreview from "@/components/monetization/PhaseLockedPreview";

export default function SubscriptionPreviewCard({
  user,
}: {
  user: MonetizedUser | null;
}) {
  const active = Boolean(user?.hasDramatizPlus && user.subscriptionStatus === "ACTIVE");

  return (
    <PhaseLockedPreview
      title="Dramatiz+ Subscription"
      description="Dramatiz+ unlocks all content. Subscription controls are visible early so readers and creators can see where the platform economy is heading."
    >
      <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-heading text-sm font-semibold">Subscription status</p>
            <p className="theme-meta mt-1 text-xs">
              {active ? "Active subscription placeholder" : "Inactive placeholder"}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            {active ? "Active" : "Upgrade"}
          </span>
        </div>

        <button type="button" disabled className="story-button-secondary mt-4 w-full justify-center opacity-70">
          {active ? "Dramatiz+ Active" : "Upgrade to Dramatiz+"}
        </button>
      </div>
    </PhaseLockedPreview>
  );
}
