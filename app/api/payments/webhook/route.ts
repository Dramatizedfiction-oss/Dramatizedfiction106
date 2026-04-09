import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      await prisma.revenueEvent.create({
        data: {
          type: "SUBSCRIPTION",
          amount: session.amount_total || 0,
          userId: session.client_reference_id
        }
      });

      break;
    }

    case "payout.paid": {
      const payout = event.data.object;

      await prisma.authorPayout.updateMany({
        where: { amount: payout.amount },
        data: { status: "PAID", processedAt: new Date() }
      });

      break;
    }
  }

  return new Response("OK", { status: 200 });
}
