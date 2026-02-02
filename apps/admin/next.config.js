/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['convex'],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
