import PhaseLockedPreview from "@/components/monetization/PhaseLockedPreview";

const breakdown = [
  { label: "Total earnings", value: "$0.00" },
  { label: "Direct purchases", value: "$0.00" },
  { label: "Subscription pool", value: "$0.00" },
  { label: "Per-content payout", value: "Placeholder" },
];

export default function EarningsDashboardPreview() {
  return (
    <PhaseLockedPreview
      title="Author Earnings"
      description="Direct purchases will show 100% author payout clearly, while Dramatiz+ subscription revenue will appear as a pooled estimate."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {breakdown.map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4"
          >
            <p className="eyebrow">{item.label}</p>
            <p className="font-heading theme-heading mt-3 text-3xl font-semibold">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </PhaseLockedPreview>
  );
}
