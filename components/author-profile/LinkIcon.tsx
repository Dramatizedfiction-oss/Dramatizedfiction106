import type { ReactNode } from "react";
import type { LinkIconKey } from "@/lib/author-profile-rules";

/*
 * Small line icons for profile links, picked from the link's domain
 * (linkIcon in lib/author-profile-rules.ts). Simple outline glyphs in one
 * style, drawn with currentColor so they follow the theme; not official logos.
 */
const PATHS: Record<LinkIconKey, ReactNode> = {
  amazon: (
    <>
      <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      <path d="M8.5 14.5c2 1.3 5 1.3 7 0" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </>
  ),
  tiktok: (
    <>
      <path d="M13 4v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M13 4c.4 2.6 2.2 4.4 5 4.6" />
    </>
  ),
  x: (
    <>
      <path d="M4.5 4.5l15 15" />
      <path d="M19.5 4.5l-15 15" />
    </>
  ),
  patreon: (
    <>
      <circle cx="14.5" cy="9.5" r="5.5" />
      <path d="M4.5 4.5v15" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" />
    </>
  ),
  kofi: (
    <>
      <path d="M4.5 8.5h11v6a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z" />
      <path d="M15.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5" />
      <path d="M8 3.5v2M11 3.5v2" />
    </>
  ),
  substack: (
    <>
      <path d="M5 4.5h14M5 8h14" />
      <path d="M5 11.5h14v9l-7-4-7 4z" />
    </>
  ),
  discord: (
    <>
      <path d="M7 6.5c3.3-1.3 6.7-1.3 10 0l2 9.5c-1.6 1.5-3.4 2.3-5 2.5l-1-1.8h-2l-1 1.8c-1.6-.2-3.4-1-5-2.5z" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" />
    </>
  ),
  facebook: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 21v-8h2.5M13.5 13H11M13.5 13v-2.5a2 2 0 0 1 2-2H16" />
    </>
  ),
  threads: (
    <>
      <path d="M16.5 11.5c-.4-2.6-2-4-4.5-4-3 0-4.5 2.2-4.5 4.5s1.5 4.5 4.5 4.5c2 0 3.2-1.1 3.2-2.6 0-2-2.4-2.6-4.4-2.1" />
      <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7" />
    </>
  ),
  bluesky: (
    <>
      <path d="M12 11c-1.5-3-4.5-6-7-6-1.5 0-1.5 2.5-1 5 .5 2.2 2.5 3 5 2.7-2.5.6-3.5 2-2 3.6 2 2 4 .4 5-2.3 1 2.7 3 4.3 5 2.3 1.5-1.6.5-3-2-3.6 2.5.3 4.5-.5 5-2.7.5-2.5.5-5-1-5-2.5 0-5.5 3-7 6z" />
    </>
  ),
  goodreads: (
    <>
      <circle cx="11.5" cy="10" r="4.5" />
      <path d="M16 5.5v10a4.5 4.5 0 0 1-8.6 1.8" />
    </>
  ),
  wattpad: <path d="M3.5 6l3.5 12 3-8 2 6 2-6 3 8 3.5-12" />,
  royalroad: (
    <>
      <path d="M4 17.5l1.5-9 4 4L12 6l2.5 6.5 4-4 1.5 9z" />
      <path d="M4 20.5h16" />
    </>
  ),
  reddit: (
    <>
      <ellipse cx="12" cy="14" rx="8" ry="5.5" />
      <path d="M12 8.5l1.2-4.5 3.8 1" />
      <circle cx="18" cy="5" r="1.2" />
      <circle cx="9" cy="13.5" r="0.9" fill="currentColor" />
      <circle cx="15" cy="13.5" r="0.9" fill="currentColor" />
    </>
  ),
  twitch: (
    <>
      <path d="M5 3.5h15v10l-4 4h-4l-3 3v-3H5z" />
      <path d="M11 8v4M15.5 8v4" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 9.5c3-1 6.5-.7 9.5.8M8 12.8c2.5-.7 5.2-.4 7.5.8M8.7 15.8c2-.5 3.8-.2 5.5.6" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5z" />
      <path d="M19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
};

export default function LinkIcon({ icon, className = "h-5 w-5" }: { icon: LinkIconKey; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[icon]}
    </svg>
  );
}
