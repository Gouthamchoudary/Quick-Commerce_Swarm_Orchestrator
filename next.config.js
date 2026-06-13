/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Vercel (no trailing slash needed for Vercel)
  reactStrictMode: true,
  // Suppress the x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
