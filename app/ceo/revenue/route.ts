import { prisma } from "@/lib/prisma";
import { requireApiCEO } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/phases";

export async function GET() {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;

  const settings = await getPlatformSettings();

  if (!settings.phaseTwoUnlocked && !settings.phaseThreeUnlocked) {
    return Response.json({
      totalRevenue: 0,
      subscriptionRevenue: 0,
      adRevenue: 0,
      monetizationActive: false
    });
  }

  // EPISODE_READ rows are legacy page-view records, not money: reads are
  // excluded from revenue totals and are no longer created.
  const [totalRevenue, subscriptionRevenue, adRevenue] = await Promise.all([
    prisma.revenueEvent.aggregate({
      where: { type: { in: ["SUBSCRIPTION", "AD_WATCH"] } },
      _sum: { amount: true }
    }),
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

