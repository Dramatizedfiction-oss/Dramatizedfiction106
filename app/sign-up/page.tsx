import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 lg:px-8">
      <div className="glass-panel rounded-[32px] border border-[var(--border-color)] p-6 md:p-8">
        <p className="eyebrow">Create Account</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
          Sign up
        </h1>
        <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
          Create your Dramatized Fiction account with Neon authentication.
        </p>

        <div className="mt-8">
          <AuthView path="sign-up" />
        </div>
      </div>
    </main>
  );
}
