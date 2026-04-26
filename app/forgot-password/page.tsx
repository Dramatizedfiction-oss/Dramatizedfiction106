import AuthPageShell from "@/components/auth/AuthPageShell";
import NeonForgotPasswordView from "@/components/auth/NeonForgotPasswordView";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Password Recovery"
      title="Forgot password"
      description="Reset your Dramatized Fiction account password with Neon authentication."
      links={[{ href: "/sign-in", label: "Back to sign in" }]}
    >
      <NeonForgotPasswordView />
    </AuthPageShell>
  );
}
