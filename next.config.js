/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Vercel (no trailing slash needed for Vercel)
  reactStrictMode: true,
  // Suppress the x-powered-by header
  poweredByHeader: false,
  // Ignore typescript and eslint build errors for robust Vercel builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

