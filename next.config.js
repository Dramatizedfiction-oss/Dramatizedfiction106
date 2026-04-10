/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ensures App Router features behave consistently
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },

  // Allow images from anywhere (you can tighten this later)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Ensures Vercel edge/runtime compatibility
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
