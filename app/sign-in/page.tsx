import AuthPageShell from "@/components/auth/AuthPageShell";
import SignInForm from "@/components/auth/SignInForm";
import { ERROR_COPY } from "@/lib/error-copy";

export const metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: { searchParams?: { callbackUrl?: string } }) {
  // Sent here from a page that needs an account (the site's "401"): say so in the site's voice.
  const fromProtectedPage = Boolean(searchParams?.callbackUrl);
  return (
    <AuthPageShell
      eyebrow="Account Access"
      title={fromProtectedPage ? ERROR_COPY[401].title : "Sign in"}
      description={
        fromProtectedPage ? ERROR_COPY[401].line : "Access your Dramatized Fiction account with a stable persistent session."
      }
      links={[
        { href: "/sign-up", label: "Don't have an account? Sign up" },
        { href: "/forgot-password", label: "Forgot password?" },
      ]}
    >
      <SignInForm />
    </AuthPageShell>
  );
}
