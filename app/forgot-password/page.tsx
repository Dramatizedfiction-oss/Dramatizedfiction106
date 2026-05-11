import AuthPageShell from "@/components/auth/AuthPageShell";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Password Recovery"
      title="Forgot password"
      description="Password reset email flow is not active yet, but the platform session system is now handled directly in-app."
      links={[{ href: "/sign-in", label: "Back to sign in" }]}
    >
      <div className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-4 text-sm text-[var(--text-primary)]">
        Password recovery will be connected when email recovery is enabled. For now,
        contact platform support if you need account help.
      </div>
    </AuthPageShell>
  );
}
