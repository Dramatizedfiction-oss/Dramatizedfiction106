/*
 * What activating Phase 2 / Phase 3 means, and whether it is safe yet.
 * Pure (environment passed in), so it can be unit-tested.
 *
 * Requirements come in two kinds:
 *   - configuration: server environment variables that must be set;
 *   - implementation: product pieces that must exist in the code. These are
 *     constants below, set to false because the pieces do not exist yet.
 *     Flip one only when the feature is genuinely built and reviewed.
 * A phase can be activated only when every requirement is met.
 */

export type PhaseNumber = 2 | 3;

export function parsePhase(value: unknown): PhaseNumber | null {
  return value === "2" || value === 2 ? 2 : value === "3" || value === 3 ? 3 : null;
}

/** Built-and-reviewed product pieces. All false today (see each `detail`). */
export const PHASE_IMPLEMENTATION = {
  readerCheckout: false,
  paidAccessGrants: false,
  payoutProcessing: false,
  adProvider: false,
  adRevenueAccounting: false,
} as const;

export type Requirement = { id: string; label: string; kind: "configuration" | "implementation"; met: boolean; detail: string };

type Env = Record<string, string | undefined>;

function isHttpsUrl(value: string | undefined) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function evaluatePhaseReadiness(
  phase: PhaseNumber,
  env: Env,
  implementation: Record<keyof typeof PHASE_IMPLEMENTATION, boolean> = PHASE_IMPLEMENTATION,
): { ready: boolean; requirements: Requirement[] } {
  const requirements: Requirement[] =
    phase === 2
      ? [
          {
            id: "stripe-secret",
            label: "Stripe secret key",
            kind: "configuration",
            met: /^(sk|rk)_(live|test)_/.test(env.STRIPE_SECRET_KEY ?? ""),
            detail: "STRIPE_SECRET_KEY must be set on the server for Stripe Connect.",
          },
          {
            id: "stripe-webhook",
            label: "Stripe webhook secret",
            kind: "configuration",
            met: /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET ?? ""),
            detail: "STRIPE_WEBHOOK_SECRET must be set so payment events can be verified.",
          },
          {
            id: "stripe-urls",
            label: "Stripe onboarding return addresses",
            kind: "configuration",
            met: isHttpsUrl(env.STRIPE_REFRESH_URL) && isHttpsUrl(env.STRIPE_RETURN_URL),
            detail: "STRIPE_REFRESH_URL and STRIPE_RETURN_URL must be https addresses on the live site.",
          },
          {
            id: "reader-checkout",
            label: "Reader checkout (purchases and Dramatiz+)",
            kind: "implementation",
            met: implementation.readerCheckout,
            detail: "There is no checkout yet: readers have no way to buy an episode, a series or a Dramatiz+ subscription.",
          },
          {
            id: "paid-access",
            label: "Access after payment",
            kind: "implementation",
            met: implementation.paidAccessGrants,
            detail:
              "Nothing grants access after a payment: lib/monetization.ts treats every reader as owning nothing, so locked episodes would stay unreadable for everyone.",
          },
          {
            id: "payouts",
            label: "Author payout processing",
            kind: "implementation",
            met: implementation.payoutProcessing,
            detail:
              "Payouts are not calculated or sent. The current webhook marks payout records paid by matching amounts only, which is not safe for real money.",
          },
        ]
      : [
          {
            id: "ad-provider",
            label: "Advertising provider",
            kind: "implementation",
            met: implementation.adProvider,
            detail: "No ad network is integrated: the between-episode ad page shows a placeholder, not an ad.",
          },
          {
            id: "ad-revenue",
            label: "Ad revenue accounting",
            kind: "implementation",
            met: implementation.adRevenueAccounting,
            detail: "Each ad impression records a placeholder amount of 1, not real revenue.",
          },
        ];

  return { ready: requirements.every((requirement) => requirement.met), requirements };
}

/** Plain-English explanation shown before the CEO password step. */
export const PHASE_EXPLANATIONS: Record<
  PhaseNumber,
  {
    name: string;
    summary: string;
    activates: string[];
    readers: string[];
    writers: string[];
    operations: string[];
    systems: string[];
    reversal: string;
  }
> = {
  2: {
    name: "Phase 2: Monetization",
    summary: "Turns on the platform's payment gate (phaseTwoUnlocked + enablePayments).",
    activates: [
      "The Phase 2 payment gate that the payment routes check.",
      "Writers' Stripe Connect onboarding (POST /api/payments/connect creates real Stripe Express accounts).",
      "The Stripe webhook (POST /api/payments/webhook) starts recording payment events.",
    ],
    readers: [
      "Nothing visible changes yet: there is no checkout, no purchase button and no Dramatiz+ sign-up.",
      "Locked episodes stay unreadable, because nothing grants access after a payment.",
    ],
    writers: [
      "Writers could start Stripe Connect onboarding once a way to start it exists in Writer Studio (it does not yet).",
      "No earnings are calculated or paid out.",
    ],
    operations: [
      "Stripe account, tax and payout obligations once real money moves.",
      "Watching the webhook and resolving failed or disputed payments.",
    ],
    systems: ["Stripe (Connect + webhooks)", "Settings.phaseTwoUnlocked / enablePayments", "app/api/payments/*", "RevenueEvent"],
    reversal:
      "Activation is one-way in the current design: there is no deactivation control. Turning payments off later would need a reviewed change to Settings and handling of any accounts or payments already created.",
  },
  3: {
    name: "Phase 3: Discovery and advertising",
    summary: "Turns on the platform's advertising gate (phaseThreeUnlocked + enableAds).",
    activates: [
      "Between-episode ad transitions for readers (lib/ad-transition.ts pacing).",
      "Ad impression recording (POST /api/ads/impression).",
    ],
    readers: [
      "Readers would sometimes be asked to watch an ad between episodes, never during reading.",
      "Today that page is a placeholder, so readers would see a fake ad.",
    ],
    writers: ["No change for writers: there is no ad revenue share."],
    operations: ["Choosing and managing an ad provider, ad policies and ad quality.", "Reconciling ad revenue."],
    systems: ["Settings.phaseThreeUnlocked / enableAds", "/watch-ad", "app/api/ads/impression", "AdImpression", "RevenueEvent"],
    reversal:
      "Activation is one-way in the current design: there is no deactivation control. Turning ads off later would need a reviewed change to Settings.",
  },
};
