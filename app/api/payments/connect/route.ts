import { stripe } from "@/lib/stripe";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: "express",
    email: session.user.email || undefined
  });

  // Save to DB
  await prisma.user.update({
    where: { id: session.user.id },
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
