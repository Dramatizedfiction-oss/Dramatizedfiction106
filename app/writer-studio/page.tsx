import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export default async function WriterStudioAliasPage() {
  const session = await auth();
  requireRole(session, ["WRITER"]);
  redirect("/writer");
}
