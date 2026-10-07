import { getStripe } from "@/lib/stripe";
import { requireApiRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { isPhaseTwoActive } from "@/lib/phases";

export const runtime = "nodejs";

export async function POST() {
  const phaseTwoActive = await isPhaseTwoActive();

  if (!phaseTwoActive) {
    return Response.json({ error: "Phase 2 is inactive" }, { status: 403 });
  }

  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const stripe = getStripe();

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: "express",
    email: guard.user.email || undefined
  });

  // Save to DB
  await prisma.user.update({
    where: { id: guard.user.id },
    data: { stripeAccountId: account.id }
  });

  // Generate onboarding link
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: process.env.STRIPE_REFRESH_URL!,
    return_url: process.env.STRIPE_RETURN_URL!,
    type: "account_onboarding"
  });

  return Response.json({ url: link.url });
}
