import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RestrictedScreen from "@/components/platform/RestrictedScreen";

// Where page guards send members with an active restriction.
export default async function AccountRestrictedPage() {
  const session = await auth();
  if (!session?.user?.restriction) redirect("/");
  return <RestrictedScreen restriction={session.user.restriction} />;
}
