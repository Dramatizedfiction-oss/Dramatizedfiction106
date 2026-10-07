import { auth } from "@/auth";
import { WRITER_ONBOARDING_SLUG } from "@/lib/cms";
import { requireRole } from "@/lib/utils";
import CeoSettingsClient from "./CeoSettingsClient";

// Server-side CEO check before the settings UI is rendered.
export default async function CEOSettingsPage() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  return <CeoSettingsClient onboardingSlug={WRITER_ONBOARDING_SLUG} />;
}
