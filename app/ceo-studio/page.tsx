import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export default async function CeoStudioAliasPage() {
  const session = await auth();
  requireRole(session, ["CEO"]);
  redirect("/ceo");
}
