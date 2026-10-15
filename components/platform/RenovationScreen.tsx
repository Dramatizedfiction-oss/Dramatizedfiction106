import { BrandMarkImage } from "@/components/brand/BrandMark";
import ErrorScene, { errorActionClass } from "@/components/errors/ErrorScene";

/*
 * Shown instead of the whole application while Renovation Mode is on (for
 * everyone except CEO and Board): the site's 503 page. Rendered by the root
 * layout on the server, so the regular pages are never sent. The night-desert
 * scene (components/errors/ErrorScene) reads the same in light and dark.
 */
export default function RenovationScreen({ signedIn }: { signedIn: boolean }) {
  return (
    <main>
      <ErrorScene
        fullScreen
        eyebrow="Dramatized Fiction"
        title="We're setting the stage."
        line="Dramatized Fiction is closed for a short renovation while we make some big changes. Your stories, profile and progress are safe. Please check back soon."
        action={
          // A plain link reload: no client code needed on this screen.
          <a href="/" className={errorActionClass}>
            Check again
          </a>
        }
      >
        <span className="flex flex-col items-center gap-4">
          <BrandMarkImage size={48} />
          {signedIn ? null : (
            <span>
              Team member?{" "}
              <a href="/sign-in" className="underline decoration-1 underline-offset-4 hover:text-white">
                Sign in
              </a>
            </span>
          )}
        </span>
      </ErrorScene>
    </main>
  );
}
