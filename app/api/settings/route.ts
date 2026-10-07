import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiCEO } from "@/lib/auth/guards";
import {
  ensurePlatformSettings,
  getPlatformSettings,
  isValidPhaseUnlockCode,
} from "@/lib/phases";

// CEO-only (used by /ceo/settings). Phase unlock/enable rules are unchanged.
const updateSettingsSchema = z.object({
  siteName: z.string().max(120).optional(),
  enableAds: z.boolean().optional(),
  enablePayments: z.boolean().optional(),
  phaseTwoUnlocked: z.boolean().optional(),
  phaseThreeUnlocked: z.boolean().optional(),
  phaseTwoCode: z.string().max(64).optional(),
  phaseThreeCode: z.string().max(64).optional(),
});

export async function GET() {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;

  return NextResponse.json(await getPlatformSettings());
}

export async function PATCH(req: Request) {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(req, updateSettingsSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const existing = await ensurePlatformSettings();
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
        enableAds: phaseThreeUnlocked ? Boolean(body.enableAds) : false,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings update failed.", error);
    return serverError();
  }
}
