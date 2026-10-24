import Link from "next/link";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { Note } from "@/components/ui/Surface";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Password Recovery"
      title="Forgot password"
      description="Password reset email flow is not active yet, but the platform session system is now handled directly in-app."
      links={[{ href: "/sign-in", label: "Back to sign in" }]}
    >
      <Note>
        Password recovery will be connected when email recovery is enabled. For now,{" "}
        <Link href="/contact" className="font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
          contact platform support
        </Link>{" "}
        if you need account help.
      </Note>
    </AuthPageShell>
  );
}
