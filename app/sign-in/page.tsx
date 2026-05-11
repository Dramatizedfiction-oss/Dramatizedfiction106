import AuthPageShell from "@/components/auth/AuthPageShell";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <AuthPageShell
      eyebrow="Account Access"
      title="Sign in"
      description="Access your Dramatized Fiction account with a stable persistent session."
      links={[
        { href: "/sign-up", label: "Don't have an account? Sign up" },
        { href: "/forgot-password", label: "Forgot password?" },
      ]}
    >
      <SignInForm />
    </AuthPageShell>
  );
}
