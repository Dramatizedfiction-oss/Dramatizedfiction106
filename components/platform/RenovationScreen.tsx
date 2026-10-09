import Link from "next/link";
import { BookOpenIcon } from "@/components/icons";

/*
 * Shown instead of the whole application while Renovation Mode is on (for
 * everyone except CEO and Board). Rendered by the root layout on the server,
 * so the regular pages are never sent. Works in light and dark and on phones.
 */
export default function RenovationScreen({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="app-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22),transparent_65%)] blur-2xl" />
        <div className="absolute -right-24 bottom-[-15%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_65%)] blur-2xl" />
      </div>

      <section className="relative w-full max-w-xl text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl shadow-[var(--shadow-raised)]"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
        >
          <BookOpenIcon size={24} className="text-white" />
        </span>
        <p className="eyebrow mt-8">Dramatized Fiction</p>
        <h1 className="font-heading theme-heading mt-4 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
          We&apos;re setting the stage.
        </h1>
        <p className="theme-body mx-auto mt-5 max-w-md text-base leading-7">
          Dramatized Fiction is closed for a short renovation while we make some big changes. Your stories, profile and
          progress are safe. Please check back soon.
        </p>
        {signedIn ? null : (
          <p className="theme-meta mt-10 text-xs">
            Team member?{" "}
            <Link href="/sign-in" className="underline underline-offset-4 hover:text-[var(--text-primary)]">
              Sign in
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
