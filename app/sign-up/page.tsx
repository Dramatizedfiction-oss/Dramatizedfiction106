import AuthPageShell from "@/components/auth/AuthPageShell";
import NeonSignUpView from "@/components/auth/NeonSignUpView";

export default function SignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Create Account"
      title="Sign up"
      description="Create your Dramatized Fiction account with Neon authentication."
      links={[{ href: "/sign-in", label: "Already have an account? Sign in" }]}
    >
      <NeonSignUpView />
    </AuthPageShell>
  );
}
