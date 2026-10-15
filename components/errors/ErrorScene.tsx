import type { ReactNode } from "react";

/*
 * The themed error page (Sweep B1): the night-desert scene with a short line
 * and one next step. No database, no session, no providers: it renders even
 * when everything else is down (the image is a static file in public/brand/).
 * The scene is night-dark in both themes, with light text.
 *
 * At every size the picture is shown whole across the bottom (cactus at the
 * left, moon at the right: cropping a wide picture to a tall or square panel
 * would lose one of them), its top edge fading into its own sky colour, which
 * fills the space above where the words sit. On very wide screens the top of
 * the picture (plain sky) is what gets clipped.
 */

/** The image's sky colour (sampled from design/night-desert-source.png). */
export const NIGHT_SKY = "#0e0828";

export default function ErrorScene({
  eyebrow,
  title,
  line,
  action,
  fullScreen = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  line: string;
  /** The one next step (a link or a button). */
  action: ReactNode;
  /** Fill the whole viewport (global error, renovation); otherwise a panel inside the page. */
  fullScreen?: boolean;
  /** Extra small print under the action. */
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="error-title"
      className={`relative isolate flex flex-col overflow-hidden text-[#f3f1f8] ${
        fullScreen ? "min-h-[100svh]" : "min-h-[calc(100svh-3.5rem)] rounded-[24px] md:min-h-[calc(100svh-6rem)] md:rounded-[28px]"
      }`}
      style={{ background: NIGHT_SKY, colorScheme: "dark" }}
    >
      <picture className="pointer-events-none absolute inset-x-0 bottom-0 -z-10">
        <source media="(min-width: 768px)" srcSet="/brand/night-desert-1600.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/night-desert-800.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          // The top edge fades into the plain sky above it (no seam).
          className="block h-auto w-full [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
        />
      </picture>
      {/* Keeps the words readable where they overlap the sky on wide screens. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-2/3" style={{ background: `linear-gradient(${NIGHT_SKY}, transparent)` }} />

      <div className="mx-auto w-full max-w-xl px-6 pb-[min(50vw,22rem)] pt-[12vh] text-center md:pt-[10vh]">
        {eyebrow ? <p className="font-mono-df text-xs uppercase tracking-[0.3em] text-[#c4b5fd]">{eyebrow}</p> : null}
        <h1 id="error-title" className="font-heading mt-4 text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#d9d4e6]">{line}</p>
        <div className="mt-8 flex justify-center">{action}</div>
        {children ? <div className="mt-6 text-sm text-[#b3afc0]">{children}</div> : null}
      </div>
    </section>
  );
}

/** The action as a link, styled for the dark scene. */
export const errorActionClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#7c3aed] px-7 text-base font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.45)] transition hover:bg-[#8b5cf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0828]";
