import AuthPageShell from "@/components/auth/AuthPageShell";
import NeonSignInView from "@/components/auth/NeonSignInView";

export default function SignInPage() {
  return (
    <AuthPageShell
      eyebrow="Account Access"
      title="Sign in"
      description="Access your Dramatized Fiction account with Neon authentication."
      links={[
        { href: "/sign-up", label: "Don't have an account? Sign up" },
        { href: "/forgot-password", label: "Forgot password?" },
      ]}
    >
      <NeonSignInView />
    </AuthPageShell>
  );
}
