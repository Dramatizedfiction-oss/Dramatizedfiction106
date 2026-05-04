import PhaseLockedPreview from "@/components/monetization/PhaseLockedPreview";

export default function StripePayoutPreview() {
  return (
    <PhaseLockedPreview
      title="Stripe Payouts"
      description="Authors will be able to connect a Stripe account for payouts once Phase 2 is activated."
    >
      <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-heading text-sm font-semibold">Payout status</p>
            <p className="theme-meta mt-1 text-xs">Not Connected</p>
          </div>
          <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Pending
          </span>
        </div>

        <button type="button" disabled className="story-button-secondary mt-4 w-full justify-center opacity-70">
          Connect Stripe Account
        </button>
      </div>
    </PhaseLockedPreview>
  );
}
