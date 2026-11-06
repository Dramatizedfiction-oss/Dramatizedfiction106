const isProduction = process.env.NODE_ENV === "production";

/*
 * Security headers (Sweep 1). The Content Security Policy is REPORT-ONLY for
 * now: browsers log what it would block (in the console) but block nothing,
 * so pages can't break. Once a few weeks of normal use show no reports, the
 * same value moves to "Content-Security-Policy". Inline scripts are allowed
 * because Next.js and the theme/reading pre-paint scripts (app/layout.tsx)
 * use them; images may come from any https host because older covers can be
 * external URLs.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  // No other site may show these pages in a frame (stops clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see only our domain, never the page path (episode ids, ?highlight=).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HTTPS only, once a browser has seen the site over HTTPS (never on localhost).
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No "X-Powered-By: Next.js" header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // A separate build folder for checking a production build while `npm run dev`
  // keeps using .next (NEXT_DIST_DIR=.next-verify npm run build). Unset = .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The app shows plain <img> tags (no next/image), so the image optimizer is
  // switched off: /_next/image answers 404. Next 14 has unpatched advisories in
  // that endpoint (fixed only in 15.5+), so it shouldn't be reachable.
  images: { unoptimized: true },
  experimental: {
    // workerThreads was removed (Sweep E): with it, the build's page workers
    // couldn't reach the shared data cache ("localhost:undefined").
    webpackBuildWorker: false,
    // Loaded by Node at runtime instead of bundled: @vercel/blob's HTTP client
    // (undici) uses syntax Next 14.1's bundler can't parse; sharp is native.
    serverComponentsExternalPackages: ["@vercel/blob", "sharp"]
  },
  async redirects() {
    // Writer Studio routes replaced by the redesigned studio. Temporary (307)
    // so they can still change; query strings are passed through.
    return [
      { source: "/writer-studio/stories", destination: "/writer-studio/episodes", permanent: false },
      { source: "/writer-studio/drafts", destination: "/writer-studio/episodes?status=draft", permanent: false },
      { source: "/writer-studio/analytics", destination: "/writer-studio/stats", permanent: false },
      { source: "/writer-studio/new-episode", destination: "/writer-studio/episodes/new", permanent: false },
      {
        source: "/writer-studio/publish/:episodeId",
        destination: "/writer-studio/episodes/:episodeId/publish",
        permanent: false
      },
      {
        source: "/writer-studio/:page(editor|characters|media|scheduling|settings|wip-projects|notifications)",
        destination: "/writer-studio",
        permanent: false
      },
      // Administration replaced Command Center and the old /ceo pages; CEO
      // Studio now lives at /ceo-studio. The destinations check access.
      { source: "/command-center/:path*", destination: "/administration", permanent: false },
      { source: "/ceo", destination: "/ceo-studio", permanent: false },
      { source: "/ceo/users", destination: "/administration/members", permanent: false },
      { source: "/ceo/analytics", destination: "/administration/analytics", permanent: false },
      { source: "/ceo/settings", destination: "/administration/content", permanent: false },
      // The avatar tools: Administration › Avatars, then › Store (Sweep B3), now
      // Back of the store › Avatars (Sweep D).
      { source: "/administration/avatars", destination: "/administration/back-of-store/avatars", permanent: false },
      { source: "/administration/store", destination: "/administration/back-of-store/avatars", permanent: false }
    ];
  }
};

module.exports = nextConfig;
