import AuthPageShell from "@/components/auth/AuthPageShell";
import SignUpForm from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Create Account"
      title="Sign up"
      description="Create a persistent reader account that can later unlock writer or leadership access."
      links={[{ href: "/sign-in", label: "Already have an account? Sign in" }]}
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
