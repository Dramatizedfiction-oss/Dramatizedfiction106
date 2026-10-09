/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
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
      { source: "/ceo/settings", destination: "/administration/content", permanent: false }
    ];
  }
};

module.exports = nextConfig;
