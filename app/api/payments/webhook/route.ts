import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing webhook configuration", { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      await prisma.revenueEvent.create({
        data: {
          type: "SUBSCRIPTION",
          amount: session.amount_total || 0,
          userId: session.client_reference_id || null
        }
      });

      break;
    }

    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;

      await prisma.authorPayout.updateMany({
        where: { amount: payout.amount },
        data: { status: "PAID", processedAt: new Date() }
      });

      break;
    }
  }

  return new Response("OK", { status: 200 });
}
