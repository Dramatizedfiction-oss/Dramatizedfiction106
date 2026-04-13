import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const [totalRevenue, subscriptionRevenue, adRevenue] = await Promise.all([
    prisma.revenueEvent.aggregate({ _sum: { amount: true } }),
    prisma.revenueEvent.aggregate({
      where: { type: "SUBSCRIPTION" },
      _sum: { amount: true }
    }),
    prisma.revenueEvent.aggregate({
      where: { type: "AD_WATCH" },
      _sum: { amount: true }
    })
  ]);

  return Response.json({
    totalRevenue: totalRevenue._sum.amount || 0,
    subscriptionRevenue: subscriptionRevenue._sum.amount || 0,
    adRevenue: adRevenue._sum.amount || 0
  });
}

