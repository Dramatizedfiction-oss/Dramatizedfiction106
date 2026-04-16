import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import { getPlatformSettings } from "@/lib/phases";

export async function GET() {
  const session = await auth();
  requireRole(session, ["CEO"]);
  const settings = await getPlatformSettings();

  if (!settings.phaseTwoUnlocked && !settings.phaseThreeUnlocked) {
    return Response.json({
      totalRevenue: 0,
      subscriptionRevenue: 0,
      adRevenue: 0,
      monetizationActive: false
    });
  }

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
    adRevenue: adRevenue._sum.amount || 0,
    monetizationActive: true
  });
}

