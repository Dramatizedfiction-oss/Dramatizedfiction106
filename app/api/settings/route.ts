import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import { getPlatformSettings, isValidPhaseUnlockCode } from "@/lib/phases";

export async function GET() {
  const settings = await getPlatformSettings();
  return Response.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const body = await req.json();
  const existing = await getPlatformSettings();
  const phaseTwoCodeValid = isValidPhaseUnlockCode(body.phaseTwoCode);
  const phaseThreeCodeValid = isValidPhaseUnlockCode(body.phaseThreeCode);

  const phaseTwoUnlocked =
    existing.phaseTwoUnlocked || Boolean(body.phaseTwoUnlocked && phaseTwoCodeValid);
  const phaseThreeUnlocked =
    existing.phaseThreeUnlocked || Boolean(body.phaseThreeUnlocked && phaseThreeCodeValid);

  const updated = await prisma.settings.update({
    where: { id: existing.id },
    data: {
      siteName: body.siteName ?? existing.siteName,
      phaseTwoUnlocked,
      phaseThreeUnlocked,
      enablePayments: phaseTwoUnlocked ? Boolean(body.enablePayments) : false,
      enableAds: phaseThreeUnlocked ? Boolean(body.enableAds) : false
    }
  });

  return Response.json(updated);
}
